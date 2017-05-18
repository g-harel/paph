'use strict';

const paph = () => {
    const transforms = {};

    const add = (initialName, finalName, transform) => {
        if (!transforms[initialName]) {
            transforms[initialName] = [];
        }
        transforms[initialName].push({finalName, transform});
    };

    const findPath = (initialName, finalName) => {
        const traversed = {};
        const _find = (currentAddress, currentName) => {
            if (traversed[currentName] < currentAddress.length) {
                return null;
            }
            traversed[currentName] = currentAddress.length;
            if (currentName === finalName) {
                return currentAddress;
            }
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
                let path = _find(tempAddress, transformPossibilities[i].finalName);
                if (path !== null) {
                    successes.push(path);
                }
            }
            if (successes.length > 0) {
                return successes.reduce((shortestSuccess, currentSuccess) => {
                    return shortestSuccess.length > currentSuccess.length
                        ? currentSuccess
                        : shortestSuccess;
                }, {length: Infinity});
            }
            return null;
        };
        return _find([], initialName);
    };

    const exec = (initialName, finalName, val) => {
        let steps = findPath(initialName, finalName);
        if (steps === null) {
            throw new Error(`no path found for ${initialName} -> ${finalName}`);
        }
        let tempVal = val;
        for (let i = 0; i < steps.length; i += 2) {
            tempVal = transforms[steps[i]][steps[i+1]].transform(tempVal);
        }
        return tempVal;
    };

    return {add, exec};
};

module.exports = paph;
