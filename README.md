# paph

> Data manipulation using a graph of transformations.

Shortest path between `start` and `end` is found before applying any transformations to the input data.

Built in protection against cycles.

## Install

````
$ npm install --save paph
````

## Usage

````javascript
const paph = require('paph');

// creating a relationship
pahp.add(start, end, transformer);
           └──┬──┘       └┐
            String     Function

// querying relationships
paph.exec(start, end, object);
           └──┬──┘      └┐
            String     Object
````

````javascript
const paph = require('paph');

paph.add('v1', 'v2', (data) => {
    // ...
    return modifiedData
});

paph.add('v2', 'v3', (data) => {
    // ...
    return modifiedData
});

paph.exec('v1', 'v3', data);
````