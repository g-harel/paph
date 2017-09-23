# [paph](https://github.com/g-harel/paph)

[![Codecov](https://img.shields.io/codecov/c/github/g-harel/paph.svg)](https://codecov.io/gh/g-harel/paph)

> Data-flow-graph based tool to transform data.

Shortest path between `initial` and `final` is found before returning a combined function of all the transitions.

Built in protection against cycles.

## Install

````
$ npm install --save paph
````

## Usage

````javascript
const paph = require('paph');

const store = paph();

// creating a relationship
store.add(start, end, weight, transition);
            └─┬──┘      │        └┐
            String    Number   Function

// querying relationships
store.query(initial, final); // returns a function
               └──┬───┘
                String
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
