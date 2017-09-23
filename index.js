// @flow
'use strict';

/*::
type Transition = {
    startName?: string,
    endName: string,
    transition: function,
    weight: number,
}

type Transitions = {
    [name: string]: Array<Transition>
}

type Path = {
    address: Array<number | string>,
    weight: number,
}

type Precomputed = {
    [name: string]: Path
}

type Traversed = {
    [name: string]: number
}
*/

const assert = (assertion, message) => {
    if (Boolean(assertion) === false) {
        throw new Error(message);
    }
};

// function to add a path into a store (transitions)
const add = (transitions /*: Transitions */) => ({
    startName = '',
    endName = '',
    weight,
    transition,
} /*: Transition */) /*: void */ => {
    assert(typeof startName === 'string' && startName, `startName is not a valid string: ${startName}`);
    assert(typeof endName === 'string' && endName, `endName is not a valid string: ${endName}`);
    assert(typeof weight === 'number', `weight is not a number: ${weight}`);
    assert(typeof transition === 'function', `transition is not a function: ${String(transition)}`);

    // negative/zero weight paths can cause an issue where it is possible for the path
    // finding algorithm to loop infinitely since there is no weight penalty per cycle.
    if (weight < 0) {
        throw new Error(`negative weights are not allowed (weight of ${weight} between "${startName}" and "${endName}")`);
    }

    // transitions is a map where outgoing paths are stored in an array at the key
    // of each node. the array must be created if it doesn't exist.
    if (transitions[startName] === undefined) {
        transitions[startName] = [];
    }
    transitions[startName].push({endName, transition, weight});
};

// function to find a composite path between two nodes
const findPath = (
    transitions /*: Transitions */,
    traversed /*: Traversed */,
    precomputed /*: Precomputed */
) => (
    initialName /*: string */,
    finalName /*: string */
) /*: Path | null */ => {
    console.log(traversed);
    console.log(precomputed);
    // recursive function to navigate the transitions structure and return the shortest path.
    // it uses the finalName variable from its parent scope. a failiure to find a path will
    // result in a return value of null.
    const find = (
        currentWeight /*: number */,
        currentName /*: string */
    ) /*: Path | null */ => {
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
            if (precomputed[currentName] === undefined) {
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
        const fastestPath = transitionPossibilities.reduce((shortestPath, transition, index) => {
            const successfulPath = find(currentWeight + transition.weight, transition.endName);
            if (successfulPath === null) {
                return shortestPath;
            }

            const totalWeight = successfulPath.weight + transition.weight;

            if (shortestPath !== null && totalWeight >= shortestPath.weight) {
                return shortestPath;
            }

            // concatenating by passing an array instead of multiple arguments has
            // been tested to have much better performance.
            return {
                address: successfulPath.address.concat([currentName, index]),
                weight: totalWeight,
            };
        }, null);

        // in the case that there are no successes, return a failiure
        if (fastestPath === null) {
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
const query = (
    transitions /*: Transitions */,
    traversed /*: Traversed */,
    precomputed /*: Precomputed */
) => (
    initialName /*: string */,
    finalName /*: string */
) /*: (mixed) => mixed */ => {
    assert(typeof initialName === 'string', `initialName is not a string: ${initialName}`);
    assert(typeof finalName === 'string', `finalName is not a string: ${finalName}`);

    // the path finding function will return an address when a path is found or a null
    // when no possible path exists.
    let steps = findPath(transitions, traversed, precomputed)(initialName, finalName);
    if (steps === null) {
        throw new Error(`no path found for "${initialName}" -> "${finalName}"`);
    }

    // the result of findPath is an array of keys which form an address from the initial
    // to the final node. Since functions between the nodes need to be wrapped from the
    // inside out, the order of these keys must be reversed.
    const {address} = steps;
    let func = (obj) => obj;
    for (let i = 0; i < address.length; i += 2) {
        let _func = func;
        // each two address elements in the array represent a pair of <arrayPosition, node>
        const name = String(address[i]);
        const transitionIndex = Number(address[i+1]);
        func = (obj) => _func(transitions[name][transitionIndex].transition(obj));
    }
    return func;
};

// exported function which returns the package's api. it can be given an initial transitions
// store, but there is no validation and should therefore be used with caution.
const paph = () => {
    let transitions /*: Transitions */ = {};

    // traversed is a map which stores the lowest weight at which a node was reached.
    let traversed /*: Traversed */ = {};

    // precomputed is a map that stores the shortest path from the current node to the final node.
    let precomputed /*: Precomputed */ = {};

    // the add and query functions are implemented using currying to inject the transitions.
    return {
        add: (transition /*: Transition */) => {
            traversed = {};
            precomputed = {};
            return add(transitions)(transition);
        },
        query: (a, b) => {
            return query(transitions, traversed, precomputed)(a, b);
        },
    };
};

// exported function does not pass arguments to the paph function.
module.exports = () => paph();
