'use strict';

const is = (type, value, message) => {
    if (typeof value !== type) {
        throw new Error(message || `${value} is not a ${type}`);
    }
};

// function to add a path into a store (transitions)
const add = (transitions) => (startName, endName, weight = 1, transition) => {
    is('string', startName, `startName is not a string: ${startName}`);
    is('string', endName, `endName is not a string: ${endName}`);
    is('number', weight, `weight is not a number: ${weight}`);
    is('function', transition, `transition is not a function: ${transition}`);

    // negative/zero weight paths can cause an issue where it is possible for the path
    // finding algorithm to loop infinitely since there is no weight penalty per cycle.
    if (weight < 0) {
        throw new Error(`negative weights are not allowed (weight of ${weight} between ${startName} and ${endName})`);
    }

    // transitions is a map where outgoing paths are stored in an array at the key
    // of each node. the array must be created if it doesn't exist.
    if (!transitions[startName]) {
        transitions[startName] = [];
    }
    transitions[startName].push({endName, transition, weight});
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
    const find = (currentWeight, currentName) => {
        // if a successful path has been found, the function can return.
        if (currentName === finalName) {
            return {
                address: [],
                weight: 0,
            };
        }

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

        // at this point, the current path is the fastest to get to the current node.
        traversed[currentName] = currentWeight;

        // if this node has already been visited, the work of finding a path to the final
        // node has already been done and has been stored in the precomputed map. in this
        // case, and since it is know that the current weight is the lowest to get to this
        // node, the fastest path has been found.
        const precomputedPath = precomputed[currentName];
        if (precomputedPath !== undefined) {
            return precomputedPath;
        }

        // fetch the outgoing paths from this node. since the optimal path cannot be inferred,
        // all transitions must be considered.
        let transitionPossibilities = transitions[currentName];
        if (transitionPossibilities === undefined) {
            return null;
        }

        // iterate through all transitions and return the one with the smallest weight.
        const fastestPath = transitionPossibilities.reduce((shortest, currentTransition, index) => {
            const currentSuccess = find(currentWeight + currentTransition.weight, currentTransition.endName);
            if (currentSuccess === null) {
                return shortest;
            }

            // in the case that both values are equal, the new value is prioritized. this
            // is especially relevant in a case where the weigth is infinity since the
            // reduce's starting value should never be returned over real paths.
            if (currentSuccess.weight > shortest.weight) {
                return shortest;
            }

            // concatenating by passing an array instead of multiple arguments has
            // been tested to have much better performance.
            return {
                address: currentSuccess.address.concat([currentName, index]),
                weight: currentSuccess.weight + currentTransition.weight,
            };
        }, {weight: Infinity});

        // in the case that there are no successes, the fastest path will default to be
        // the reduce's starting value.
        if (fastestPath.address === undefined) {
            return null;
        }

        // this statement will only be reached if there is no precomputed fastest path
        // so there is no need to check if it already exists. there is also a guarantee
        // that the fastest path is being used because it has just been calculated.
        precomputed[currentName] = fastestPath;

        return fastestPath;
    };

    // begins the search at the initialName node and returns the result.
    return find(0, initialName);
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
    const {address} = steps;
    let func = (obj) => obj;
    for (let i = 0; i < address.length; i += 2) {
        let _func = func;
        // each two address elements in the array represent a pair of <arrayPosition, node>
        // (which have been reversed previously). this means that the two array elements must
        // be used together to read one function from the transitions store.
        func = (obj) => _func(transitions[address[i]][address[i+1]].transition(obj));
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
