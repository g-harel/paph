const paph = require('./index');

const add = (store, start, end, weight = 1) => {
    store.add(start, end, weight, (a) => a += ` ${start}${end}`);
};

test('finds a path when it exists', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '2', '3');
    expect(p.query('0', '3')('')).toBe(' 01 12 23');
    expect(p.query('0', '2')('')).toBe(' 01 12');
});

test('gracefully fails when no path is found', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '2', '3');
    expect(() => p.query('1', '0')('')).toThrow(/1[^]*0/);
    expect(() => p.query('a', 'b')('')).toThrow(/a[^]*b/);
});

test('finds the shortest path, regardless of order', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    add(p, '0', '2');
    add(p, '2', '3');
    expect(p.query('0', '3')('')).toBe(' 02 23');
    add(p, '0', '3');
    expect(p.query('0', '3')('')).toBe(' 03');
});

test('finds the path with the lowest weight', () => {
    const p = paph();
    add(p, '0', '1', 2);
    add(p, '1', '2', 2);
    add(p, '0', '2', 5);
    add(p, '2', '3', 1);
    expect(p.query('0', '3')('')).toBe(' 01 12 23');
});

test('doesn\'t allow negative weights', () => {
    const p = paph();
    expect(() => p.add('a', 'b', -1, () => {})).toThrow(/negative/);
});

test('doesn\'t get stuck in cycles', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '0');
    expect(() => p.query('0', 'a')('')).toThrow(Error);
    add(p, '2', '2');
    expect(() => p.query('2', 'a')('')).toThrow(Error);
});

test('can freeze the current state', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    expect(p.freeze().query('0', '2')('')).toBe(' 01 12');
});

test('frozen state cannot be modified', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    const q = p.freeze();
    add(p, '0', '2');
    expect(p.query('0', '2')('')).toBe(' 02');
    expect(q.query('0', '2')('')).toBe(' 01 12');
});

test('freezing should increase performance', () => {
    let p = paph();
    const cap = 1000;
    const queries = 50;
    for(let i = 0; i <= cap; ++i) {
        let final = Math.min(i+1+Math.floor(Math.random()*4), cap);
        let weight = 1+Math.floor(Math.random()*4);
        p.add(String(i), String(final), weight, () => {});
    }
    const timeRegularStart = process.hrtime();
    for (let i = 0; i < queries; ++i) {
        p.query('0', String(cap));
    }
    const timeRegular = process.hrtime(timeRegularStart)[0] * 1000 + process.hrtime(timeRegularStart)[1] / 1000000;
    const q = p.freeze();
    const timeFrozenStart = process.hrtime();
    for (let i = 0; i < queries; ++i) {
        q.query('0', String(cap));
    }
    const timeFrozen = process.hrtime(timeFrozenStart)[0] * 1000 + process.hrtime(timeFrozenStart)[1] / 1000000;
    console.log(`frozen was ${(timeRegular/timeFrozen).toFixed(5)}x faster (${timeRegular}ms vs. ${timeFrozen}ms)`);
    expect(timeFrozen < timeRegular).toBe(true);
});

test('can fork the current state', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    expect(p.fork().query('0', '2')('')).toBe(' 01 12');
});

test('forked state is independant of original', () => {
    const p = paph();
    add(p, '0', '1');
    add(p, '1', '2');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    const q = p.fork();
    add(p, '0', '2');
    expect(p.query('0', '2')('')).toBe(' 02');
    expect(q.query('0', '2')('')).toBe(' 01 12');
    add(q, '0', '3');
    expect(() => p.query('0', '3')).toThrow(Error);
    expect(q.query('0', '3')('')).toBe(' 03');
});
