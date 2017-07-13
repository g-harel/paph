'use strict';

const add = (transforms) => (initialName, finalName, weight = 1, transform) => {
    if (weight < 0) {
        throw new Error(`negative weights are not allowed ${initialName} -> +${weight} -> ${finalName}`);
    }
    if (!transforms[initialName]) {
        transforms[initialName] = [];
    }
    transforms[initialName].push({finalName, transform, weight});
};

const findPath = (transforms) => (initialName, finalName) => {
    const traversed = {};
    const _find = (currentAddress, currentWeight, currentName) => {
        if (currentName === finalName) {
            currentAddress.weight = currentWeight;
            return currentAddress;
        }
        if (traversed[currentName] < currentWeight) {
            return null;
        }
        traversed[currentName] = currentWeight;
        let transformPossibilities = transforms[currentName];
        if (!transformPossibilities) {
            return null;
        }
        let newAddress = currentAddress.slice();
        newAddress.push(currentName);
        let successes = [];
        for (let i = 0; i < transformPossibilities.length; ++i) {
            let tempAddress = newAddress.slice();
            tempAddress.push(i);
            let newWeight = currentWeight + transformPossibilities[i].weight;
            let path = _find(tempAddress, newWeight, transformPossibilities[i].finalName);
            if (path !== null) {
                successes.push(path);
            }
        }
        if (successes.length > 0) {
            return successes.reduce((shortestSuccess, currentSuccess) => {
                return shortestSuccess.weight > currentSuccess.weight
                    ? currentSuccess
                    : shortestSuccess;
            }, {weight: Infinity});
        }
        return null;
    };
    return _find([], 0, initialName);
};

const query = (transforms) => (initialName, finalName) => {
    let steps = findPath(transforms)(initialName, finalName);
    if (steps === null) {
        throw new Error(`no path found for ${initialName} -> ${finalName}`);
    }
    steps.reverse();
    let func = (obj) => obj;
    for (let i = 0; i < steps.length; i += 2) {
        let _func = func;
        func = (obj) => _func(transforms[steps[i+1]][steps[i]].transform(obj));
    }
    return func;
};

const memoize = (fn) => {
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

const cloneTransforms = (transforms) => {
    const _transforms = Object.assign({}, transforms);
    Object.keys(_transforms).forEach((key) => {
        _transforms[key] = _transforms[key].slice();
    });
    return _transforms;
};

const paph = (transforms = {}) => {
    const freeze = () => ({
        query: memoize(query(cloneTransforms(transforms))),
    });

    const fork = () => paph(cloneTransforms(transforms));

    return {
        add: add(transforms),
        query: query(transforms),
        freeze,
        fork,
    };
};

module.exports = paph;
