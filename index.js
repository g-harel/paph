'use strict';

const is = (type, value, message) => {
    if (typeof value !== type) {
        throw new Error(message || `${value} is not a ${type}`);
    }
};

// function to add a path into a store (transitions)
const add = (transitions) => (initialName, finalName, weight = 1, transition) => {
    is('string', initialName, `initialName is not a string: ${initialName}`);
    is('string', finalName, `finalName is not a string: ${finalName}`);
    is('number', weight, `weight is not a number: ${weight}`);
    is('function', transition, `transition is not a function: ${transition}`);

    // negative/zero weight paths can cause an issue where it is possible for the path
    // finding algorithm to loop infinitely since there is no weight penalty per cycle.
    if (weight < 0) {
        throw new Error(`negative weights are not allowed (weight of ${weight} between ${initialName} and ${finalName})`);
    }

    // transitions is a map where outgoing paths are stored in an array at the key
    // of the node. the array must be created if it doesn't exist.
    if (!transitions[initialName]) {
        transitions[initialName] = [];
    }
    transitions[initialName].push({finalName, transition, weight});
};

// function to find a composite path between two nodes
const findPath = (transitions) => (initialName, finalName) => {
    // traversed is a map which stores the lowest weight at which a node was reached.
    const traversed = {};

    // precomputed is a map that keeps track of the shortest path from the node (addressed
    // as a key) to the final node.
    const precomputed = {};

    // recursive function to navigate the transitions structure and return the shortest path.
    // it uses the finalName variable from its parent scope. a failiure to find a path will
    // result in a return value of null.
    const _find = (currentAddress, currentWeight, currentName) => {
        if (traversed[currentName]) {
            // if the current node has already been reached using a lower weight path, there
            // is no purpose in continuing to search past this point.
            if (traversed[currentName] < currentWeight) {
                return null;
            }

            // if the node has been traversed and there is no precomputed path, this node has
            // no path to the final node and there is no reason to proceed further.
            if (!precomputed[currentName]) {
                return null;
            }
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

        // if this node has already been visited, the work of finding a path to the final
        // node has already been done and has been stored in the precomputed map. in this
        // case, and since it is know that the current weight is the lowest to get to this
        // node, the fastest path has been found.
        const precomputedPath = precomputed[currentName];
        if (precomputedPath != undefined) {
            return Object.assign(
                currentAddress.concat(precomputedPath),
                {weight: currentWeight + precomputedPath.weight}
            );
        }

        // fetch the outgoing paths from this node and make sure that there are at least one.
        // since the optimal path cannot be inferred, all options must be considered.
        let transitionPossibilities = transitions[currentName];
        if (!transitionPossibilities === true) {
            return null;
        }

        // create a copy of the current address so that it doesn't pollute the search through
        // the other nodes (array passed by reference)
        let newAddress = currentAddress.slice();
        newAddress.push(currentName);

        // recursively check all possibile outwards transitions for successful paths to the
        // final node and collect them into an array.
        let successes = [];
        for (let i = 0; i < transitionPossibilities.length; ++i) {
            let tempAddress = newAddress.slice();
            tempAddress.push(i);
            let newWeight = currentWeight + transitionPossibilities[i].weight;
            let path = _find(tempAddress, newWeight, transitionPossibilities[i].finalName);
            if (path !== null) {
                successes.push(path);
            }
        }

        if (successes.length > 0) {
            // since the successes array is guaranteed to have at least one value, it is safe
            // to assume that the result of the reduce will be a valid address and not the
            // initial value passed to reduce. also, by design, the fastest path will not
            // be the initial value even if the fastest path has a weight of infinity.
            // (Infinity > Infinity === false) ~> ternary uses current success.
            const fastestPath = successes.reduce((shortestSuccess, currentSuccess) => {
                return currentSuccess.weight > shortestSuccess.weight
                    ? shortestSuccess
                    : currentSuccess;
            }, {weight: Infinity});

            // these statements will only be reached if there is no registered fastest path
            // so there is no need to check that it already exists. there is also a guarantee
            // that the fastest path is being used because it has just been calculated. the
            // path's address first needs to be cut to only the part after the current node
            // since the path finding function always returns the full path. then, the weight
            // needs to be calculated to take into account the shortening of the address.
            precomputed[currentName] = Object.assign(
                fastestPath.slice(currentAddress.length),
                {weight: fastestPath.weight - currentWeight}
            );

            return fastestPath;
        }

        return null;
    };

    // begins the search at the initialName node and returns the result.
    return _find([], 0, initialName);
};

// function to generate a composite function from the result of the findPath function.
const query = (transitions) => (initialName, finalName) => {
    is('string', initialName, `initialName is not a string: ${initialName}`);
    is('string', finalName, `finalName is not a string: ${finalName}`);

    // the path finding function will return an address when a path is found or a null
    // when no possible path exists.
    let steps = findPath(transitions)(initialName, finalName);
    if (steps === null) {
        throw new Error(`no path found for ${initialName} -> ${finalName}`);
    }

    // the result of findPath is an array of keys which form an address from the initial
    // to the final node. Since functions between the nodes need to be wrapped from the
    // inside out, the order of these keys must be reversed.
    steps.reverse();
    let func = (obj) => obj;
    for (let i = 0; i < steps.length; i += 2) {
        let _func = func;
        // each two address elements in the array represent a pair of <arrayPosition, node>
        // (which have been reversed previously). this means that the two array elements must
        // be used together to read one function from the transitions store.
        func = (obj) => _func(transitions[steps[i+1]][steps[i]].transition(obj));
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

// function to copy the transitions data structure. it will only work for a map of arrays.
// the array's contents are not cloned/modified by this process.
const cloneTransitions = (transitions) => {
    const transitionsCopy = Object.assign({}, transitions);
    Object.keys(transitionsCopy).forEach((key) => {
        transitionsCopy[key] = transitionsCopy[key].slice();
    });
    return transitionsCopy;
};

// exported function which returns the package's api. it can be given an initial transitions
// store, but there is no validation and should therefore be used with caution.
const paph = (transitions = {}) => {
    // a frozen paph will only expose the memoized query function on a copy of the store.
    const freeze = () => ({
        query: memoize(query(cloneTransitions(transitions))),
    });

    // fork will create a new paph object with a copy of the current transitions.
    const fork = () => paph(cloneTransitions(transitions));

    // the add and query functions are implemented using currying to inject the transitions.
    return {
        add: add(transitions),
        query: query(transitions),
        freeze,
        fork,
    };
};

// exported function does not pass arguments to the paph function.
module.exports = () => paph();
