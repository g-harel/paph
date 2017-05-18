const paph = require('./index');

test('finds a path when it exists', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(p.exec('0', '3', '')).toBe(' 01 12 23');
    expect(p.exec('0', '2', '')).toBe(' 01 12');
});

test('gracefully fails when no path is found', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(() => p.exec('1', '0', '')).toThrow(/1[^]*0/);
    expect(() => p.exec('a', 'b', '')).toThrow(/a[^]*b/);
});

test('finds the shortest path, regardless of order', () => {
    const p = paph();
    p.add('0', '2', (a) => a += ' 02');
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '2', (a) => a += ' 12');
    p.add('2', '3', (a) => a += ' 23');
    expect(p.exec('0', '3', '')).toBe(' 02 23');
    p.add('0', '3', (a) => a += ' 03');
    expect(p.exec('0', '3', '')).toBe(' 03');
});

test('doesn\'t get stuck in cycles', () => {
    const p = paph();
    p.add('0', '1', (a) => a += ' 01');
    p.add('1', '0', (a) => a += ' 10');
    expect(() => p.exec('0', 'a', '')).toThrow(Error);
    p.add('2', '2', (a) => a += ' 22');
    expect(() => p.exec('2', 'a', '')).toThrow(Error);
});
