// @flow
'use strict';

/*::
type Name = string

type Transition = {
    start: Name,
    end: Name,
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
const add = (transitions /*: Transitions */, transition /*: Transition */) /*: void */ => {
    // transitions is a map where outgoing paths are stored in an array at the key
    // of each node. the array must be created if it doesn't exist.
    if (transitions[transition.start] === undefined) {
        transitions[transition.start] = [];
    }
    transitions[transition.start].push(transition);
};

// function to find a composite path between two nodes
const findPath = (transitions /*: Transitions */, initial /*: Name */, final /*: Name */) /*: Path | null */ => {
    // traversed is a map which stores the lowest weight at which a node was reached.
    let traversed /*: Traversed */ = {};

    // precomputed is a map that stores the shortest path from the current node to the final node.
    let precomputed /*: Precomputed */ = {};

    // recursive function to navigate the transitions structure and return the shortest path.
    // it uses the final name from its parent scope. a failure to find a path will result
    // in a return value of null.
    const find = (currentWeight /*: number */, current /*: Name */) /*: Path | null */ => {
        // if a successful path has been found, the function can return.
        if (current === final) {
            return {
                address: [],
                weight: 0,
            };
        }

        if (traversed[current]) {
            // if the current node has already been reached using a lower weight path, there
            // is no purpose in continuing to search past this point.
            if (traversed[current] < currentWeight) {
                return null;
            }

            // if the node has been traversed and there is no precomputed path, this node has
            // no path to the final node and there is no reason to proceed further.
            if (precomputed[current] === undefined) {
                return null;
            }
        }

        // at this point, the current path is the fastest to get to the current node.
        traversed[current] = currentWeight;

        // if this node has already been visited, the work of finding a path to the final
        // node has already been done and has been stored in the precomputed map. in this
        // case, and since it is know that the current weight is the lowest to get to this
        // node, the fastest path has been found.
        const precomputedPath = precomputed[current];
        if (precomputedPath !== undefined) {
            return precomputedPath;
        }

        // fetch the outgoing paths from this node. since the optimal path cannot be inferred,
        // all transitions must be considered.
        let transitionPossibilities = transitions[current];
        if (transitionPossibilities === undefined) {
            return null;
        }

        // iterate through all transitions and return the one with the smallest weight.
        const fastestPath = transitionPossibilities.reduce((shortestPath, transition, index) => {
            const successfulPath = find(currentWeight + transition.weight, transition.end);
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
                address: successfulPath.address.concat([current, index]),
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
        precomputed[current] = fastestPath;

        return fastestPath;
    };

    // begins the search at the initial node and returns the result.
    return find(0, initial);
};

// function to generate a composite function from the result of the findPath function.
const query = (transitions /*: Transitions */, initial /*: Name */, final /*: Name */) /*: function */ => {
    // the path finding function will return an address when a path is found or a null
    // when no possible path exists.
    let path = findPath(transitions, initial, final);
    if (path === null) {
        throw new Error(`no path found for "${initial}" -> "${final}"`);
    }

    // the Path is used to wrap transitions one inside the other to form a single function.
    const {address} = path;
    let func = (obj) => obj;
    for (let i = 0; i < address.length; i += 2) {
        let _func = func;
        // each two elements in the address represent a pair of <nodeName, arrayPosition>.
        const name = String(address[i]);
        const transitionIndex = Number(address[i+1]);
        func = (obj) => _func(transitions[name][transitionIndex].transition(obj));
    }
    return func;
};

const paph = () => {
    const transitions /*: Transitions */ = {};

    let memoized /*: {
        [final: Name]: {
            [initial: Name]: function
        }
    } */ = {};

    const _add = ({start, end, weight = 1, transition} /*: Transition */) => {
        assert(typeof start === 'string' && start, `start is not a valid string: ${start}`);
        assert(typeof end === 'string' && end, `end is not a valid string: ${end}`);
        assert(typeof weight === 'number', `weight is not a number: ${weight}`);
        assert(typeof transition === 'function', `transition is not a function: ${String(transition)}`);

        // negative/zero weight paths can cause an issue where it is possible for the path
        // finding algorithm to loop infinitely since there is no weight penalty per cycle.
        if (weight < 0) {
            throw new Error(`negative weights are not allowed (weight of ${weight} between "${start}" and "${end}")`);
        }

        // memoized results must be wiped when the transition store is modified.
        memoized = {};

        return add(transitions, {start, end, weight, transition});
    };

    const _query = (initial /*: Name */, final /*: Name */) => {
        assert(typeof initial === 'string', `initial name is not a string: ${initial}`);
        assert(typeof final === 'string', `final name is not a string: ${final}`);

        // if the resulting function has already been computed, there is no need to
        // repeat the querying and the memoized result is returned.
        const temp = memoized[final];
        if (temp && temp[initial]) {
            return temp[initial];
        }
        if (!temp) {
            memoized[final] = {};
        }
        const compositeTransform = query(transitions, initial, final);
        memoized[final][initial] = compositeTransform;

        return compositeTransform;
    };

    return {add: _add, query: _query};
};

module.exports = paph;
