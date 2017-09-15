'use strict';

// TODO store the result of previously paritally computed succesful paths
//    > path between points a and c is requested
//    > path1 gets to node b with weight w and continues to c
//    > path2 gets to node b with weight < w
//    # work from path1 between b and c can be reused for path2

// function to add a path into a store (transforms)
const add = (transforms) => (initialName, finalName, weight = 1, transform) => {
    // negative/zero weight paths can cause an issue where it is possible for the
    // path finding algorithm to loop infinitely since there is no more penalty.
    if (weight < 0) {
        throw new Error(`negative weights are not allowed (weight of ${weight} between ${initialName} and ${finalName})`);
    }
    // transforms is a map where outgoing paths are stored in an array at the key
    // of the node. the array must be created if it doesn't exist.
    if (!transforms[initialName]) {
        transforms[initialName] = [];
    }
    transforms[initialName].push({finalName, transform, weight});
};

// function to find a composite path between two nodes
const findPath = (transforms) => (initialName, finalName) => {
    // traversed is a map which stores the lowest weight at which a node was reached.
    const traversed = {};

    // recursive function to navigate the transforms structure and return the shortest path.
    // it uses the finalName variable from its parent scope. a failiure to find a path will
    // result in a return value of null.
    const _find = (currentAddress, currentWeight, currentName) => {
        // if the current node has already been reached using a lower weight path, there is no
        // purpose in continuing to search past this point.
        if (traversed[currentName] < currentWeight) {
            return null;
        }
        // if the algorithm has succeded in finding a path, the address will be returned.
        // the computed weight of the address is also included in this return value since
        // it will be needed to evaluate the performance of different paths.
        if (currentName === finalName) {
            currentAddress.weight = currentWeight;
            return currentAddress;
        }
        // past this point, the current path is the fastest to get to the current node.
        traversed[currentName] = currentWeight;
        // fetch the outgoing paths from this node and make sure that there are at least one.
        // since the optimal path cannot be inferred, all options must be considered.
        let transformPossibilities = transforms[currentName];
        if (!transformPossibilities) {
            return null;
        }
        // create a copy of the current address so that it doesn't pollute the search through
        // the other nodes (array is passed as reference)
        let newAddress = currentAddress.slice();
        // adding the node to the address array
        newAddress.push(currentName);
        let successes = [];
        for (let i = 0; i < transformPossibilities.length; ++i) {
            let tempAddress = newAddress.slice();
            // adding the array index to the address array
            tempAddress.push(i);
            let newWeight = currentWeight + transformPossibilities[i].weight;
            let path = _find(tempAddress, newWeight, transformPossibilities[i].finalName);
            if (path !== null) {
                successes.push(path);
            }
        }
        // the fastest successful path is returned
        if (successes.length > 0) {
            return successes.reduce((shortestSuccess, currentSuccess) => {
                return shortestSuccess.weight > currentSuccess.weight
                    ? currentSuccess
                    : shortestSuccess;
            }, {weight: Infinity});
        }
        return null;
    };

    // begins the search at the initialName node and returns the result.
    return _find([], 0, initialName);
};

// function to generate a composite function from the result of the findPath function.
const query = (transforms) => (initialName, finalName) => {
    let steps = findPath(transforms)(initialName, finalName);
    if (steps === null) {
        throw new Error(`no path found for ${initialName} -> ${finalName}`);
    }
    // the result of findPath is an array of keys which form an address from the initial
    // to the final node. Since functions need to be wrapped from the inside out, the order
    // of these keys must be reversed.
    steps.reverse();
    let func = (obj) => obj;
    for (let i = 0; i < steps.length; i += 2) {
        let _func = func;
        // each two address elements in the array represent a pair of <arrayPosition, node>
        // (which have been reversed previously). this means that the two array elements must
        // be used together to read one function from the transforms store.
        func = (obj) => _func(transforms[steps[i+1]][steps[i]].transform(obj));
    }
    return func;
};

// function to memoize the query function. by design this implementation will only work
// to memoize a function with two arguments. it also makes the assumption that the input
// is a pure function which will not change its output. it returns the memoized function.
const memoize = (fn) => {
    // store is a map where the stored outputs can be addressed (store[arg1][arg2]).
    const store = {};

    return (a, b) => {
        if (store[a] && store[a][b]) {
            return store[a][b];
        }
        if (!store[a]) {
            store[a] = {};
        }
        const temp = fn(a, b);
        store[a][b] = temp;
        return temp;
    };
};

// function to copy the transforms data structure. it will only work for a map of arrays.
// the array's contents are not cloned/modified by this process.
const cloneTransforms = (transforms) => {
    const _transforms = Object.assign({}, transforms);
    Object.keys(_transforms).forEach((key) => {
        _transforms[key] = _transforms[key].slice();
    });
    return _transforms;
};

// exported function which returns the package's api. it can be given an initial transforms
// store, but there is no validation and should therefore be used with caution.
const paph = (transforms = {}) => {
    // a frozen paph will only expose the memoized query function on a copy of the store.
    const freeze = () => ({
        query: memoize(query(cloneTransforms(transforms))),
    });

    // fork will create a new paph object with a copy of the current transforms.
    const fork = () => paph(cloneTransforms(transforms));

    // the add and query functions are implemented using currying to inject the transforms.
    return {
        add: add(transforms),
        query: query(transforms),
        freeze,
        fork,
    };
};

// exported function does not pass arguments to the paph function.
module.exports = () => paph();
