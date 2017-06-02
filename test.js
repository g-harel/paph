const paph = require('./index');

test('finds a path when it exists', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(p.query('0', '3')('')).toBe(' 01 12 23');
    expect(p.query('0', '2')('')).toBe(' 01 12');
});

test('gracefully fails when no path is found', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(() => p.query('1', '0')('')).toThrow(/1[^]*0/);
    expect(() => p.query('a', 'b')('')).toThrow(/a[^]*b/);
});

test('finds the shortest path, regardless of order', () => {
    const p = paph();
    p.add('0', '2', (a) => a += ' 02');
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(p.query('0', '3')('')).toBe(' 02 23');
    p.add('0', '3', (a) => a += ' 03');
    expect(p.query('0', '3')('')).toBe(' 03');
});

test('finds the path with the lowest weight', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01', 2);
    p.add('1', '2', (a) => a += ' 12', 2);
    p.add('0', '2', (a) => a += ' 02', 5);
    p.add('2', '3', (a) => a += ' 23');
    expect(p.query('0', '3')('')).toBe(' 01 12 23');
});

test('doesn\'t get stuck in cycles', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '0', (a) => a += ' 10');
    expect(() => p.query('0', 'a')('')).toThrow(Error);
    p.add('2', '2', (a) => a += ' 22');
    expect(() => p.query('2', 'a')('')).toThrow(Error);
});

test('can freeze the current state', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    expect(p.freeze().query('0', '2')('')).toBe(' 01 12');
});

test('frozen state cannot be modified', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    const q = p.freeze();
    p.add('0', '2', (a) => a += ' 02');
    expect(p.query('0', '2')('')).toBe(' 02');
    expect(q.query('0', '2')('')).toBe(' 01 12');
});

test('freezing should increase performance', () => {
    let p = paph();
    const cap = 1000;
    const queries = 50;
    for(let i = 0; i <= cap; ++i) {
        let final = String(Math.min(i+1+Math.floor(Math.random()*4), cap));
        let weight = 1+Math.floor(Math.random()*4);
        p.add(String(i), final, () => {}, weight);
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
    console.log(`frozen was ${(timeRegular/timeFrozen).toFixed(5)}x faster`);
    expect(timeFrozen < timeRegular).toBe(true);
});

test('can fork the current state', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    expect(p.fork().query('0', '2')('')).toBe(' 01 12');
});

test('forked state is independant of original', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    expect(p.query('0', '2')('')).toBe(' 01 12');
    const q = p.fork();
    p.add('0', '2', (a) => a += ' 02');
    expect(p.query('0', '2')('')).toBe(' 02');
    expect(q.query('0', '2')('')).toBe(' 01 12');
    q.add('0', '3', (a) => a += ' 03');
    expect(() => p.query('0', '3')).toThrow(Error);
    expect(q.query('0', '3')('')).toBe(' 03');
});
