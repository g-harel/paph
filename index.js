const paph = (recursionLimit = 64) => {
    const transforms = {};

    const add = (initial, final, transform) => {
        if (!transforms[initial]) {
            transforms[initial] = [];
        }
        transforms[initial].push({final, transform});
    };

    const find = (currentAddress, initial, final) => {
        if (currentAddress.length > recursionLimit) {
            throw new Error('recursion limit exceeded');
        }
        if (initial === final) {
            return currentAddress;
        }
        let transformPossibilities = transforms[initial];
        if (!transformPossibilities) {
            return null;
        }
        let newAddress = currentAddress.slice();
        newAddress.push(initial);
        let successes = [];
        for (let i = 0; i < transformPossibilities.length; ++i) {
            let tempAddress = newAddress.slice();
            tempAddress.push(i);
            let path = find(tempAddress, transformPossibilities[i].final, final);
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

    const exec = (initial, final, val) => {
        let steps = find([], initial, final);
        if (steps === null) {
            throw new Error(`no path found for ${initial} -> ${final}`);
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
