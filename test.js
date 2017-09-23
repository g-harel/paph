const paph = require('./index');

const add = (store, start, end, weight = 1) => {
    store.add({
        start,
        end,
        weight,
        transition: (a) => a += ` ${start}${end}`,
    });
};

test('rejects bad inputs', () => {
    const p = paph();
    expect(() => p.add({
        start: 0,
    }))
        .toThrow(/start.*string.*0/);
    expect(() => p.add({
        start: 'start',
        end: 1,
    }))
        .toThrow(/end.*string.*1/);
    expect(() => p.add({
        start: 'start',
        end: 'end',
        weight: true,
    }))
        .toThrow(/weight.*number.*true/);
    expect(() => p.add({
        start: 'start',
        end: 'end',
        weight: 1,
        transition: null,
    }))
        .toThrow(/transition.*function.*null/);
    expect(() => p.query(0))
        .toThrow(/initial.*string.*0/);
    expect(() => p.query('initial', 1))
        .toThrow(/final.*string.*1/);
});

test('finds a path when it exists', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '2', '3');
    expect(p.query('0', '3')(''))
        .toBe(' 01 12 23');
    expect(p.query('0', '2')(''))
        .toBe(' 01 12');
});

test('gracefully fails when no path is found', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '2', '3');
    expect(() => p.query('1', '0')(''))
        .toThrow(/1[^]*0/);
    expect(() => p.query('a', 'b')(''))
        .toThrow(/a[^]*b/);
});

test('finds the shortest path, regardless of order', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '0', '2');
    add(p, '2', '3');
    expect(p.query('0', '3')(''))
        .toBe(' 02 23');
    add(p, '0', '3');
    expect(p.query('0', '3')(''))
        .toBe(' 03');
});

test('finds the path with the lowest weight', () => {
    const p = paph();
    add(p, '0', '1', 2);
    add(p, '1', '2', 2);
    add(p, '0', '2', 5);
    add(p, '2', '3', 1);
    expect(p.query('0', '3')(''))
        .toBe(' 01 12 23');
    expect(p.query('0', '3')(''))
        .toBe(' 01 12 23');
});

test('picks the first added transitions when weights are equal', () => {
    const p = paph();
    add(p, '0', '1', 1);
    add(p, '1', '2', 1);
    add(p, '0', '2', 2);
    expect(p.query('0', '2')(''))
        .toBe(' 01 12');
});

test('doesn\'t allow negative weights', () => {
    const p = paph();
    expect(() => p.add({
        start: 'a',
        end: 'b',
        weight: -1,
        transition: () => {},
    }))
        .toThrow(/negative/);
});

test('doesn\'t get stuck in cycles', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '0');
    expect(() => p.query('0', 'a')(''))
        .toThrow(Error);
    add(p, '2', '2');
    expect(() => p.query('2', 'a')(''))
        .toThrow(Error);
});

test('results should be partailly memoized', () => {
    let p = paph();
    const cap = 1000;
    for (let i = 0; i <= cap; ++i) {
        let final = Math.min(i+1+Math.floor(Math.random()*4), cap);
        let weight = 1+Math.floor(Math.random()*4);
        p.add({
            start: String(i),
            end: String(final),
            weight,
            transition: (a) => a += String(i),
        });
    }

    const timeColdStart = process.hrtime();
    const cold = p.query('0', String(cap))('');
    const timeCold = process.hrtime(timeColdStart)[0] * 1000 + process.hrtime(timeColdStart)[1] / 1000000;

    const timeHotStart = process.hrtime();
    const hot = p.query('0', String(cap))('');
    const timeHot = process.hrtime(timeHotStart)[0] * 1000 + process.hrtime(timeHotStart)[1] / 1000000;

    expect(cold === hot)
        .toBe(true);
    console.log(`hot was ${(timeCold/timeHot).toFixed(5)}x faster (${timeCold}ms vs. ${timeHot}ms)`);
    expect(timeHot < timeCold)
        .toBe(true);
});
