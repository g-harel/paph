# [paph](https://github.com/g-harel/paph)

> Data-flow-graph based tool to transform data.

Shortest path between `start` and `end` is found before returning a combined function of all the transforms.

Built in protection against cycles.

Use `fork` to create a copy of a paph object.

Use `freeze` to create a read-only copy with built-in memoization.

## Install

````
$ npm install --save paph
````

## Usage

````javascript
const paph = require('paph');

const store = paph();

// creating a relationship
store.add(start, end, weight, transformer);
            └─┬──┘      │         └┐
            String    Number   Function

// querying relationships
store.query(start, end); // returns combined function
              └─┬──┘
              String

// create copy
const forkedStore = store.fork();

// create read-only copy with memoization
const frozenStore = store.freeze();
````

````javascript
const paph = require('paph');

const store = paph();

store.add('v1', 'v2', 1, (data) => {
    // ...
    return modifiedData;
});

store.add('v2', 'v3', 1, (data) => {
    // ...
    return modifiedData;
});

store.query('v1', 'v3')(data);
````
