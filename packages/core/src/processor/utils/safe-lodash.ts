import { map, filter, reduce, cloneDeep, merge, isEqual, get, pick, omit, sum } from 'lodash';

const safeLodash = {
    map,
    filter,
    reduce,
    cloneDeep,
    merge,
    isEqual,
    get,
    pick,
    omit,
    sum,
};

function deepFreeze(obj: any) {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (typeof obj[prop] === 'object' && obj[prop] !== null) {
            deepFreeze(obj[prop]);
        }
    });
}

deepFreeze(safeLodash);

export default safeLodash;