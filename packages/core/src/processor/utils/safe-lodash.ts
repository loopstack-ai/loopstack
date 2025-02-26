import _ from 'lodash';

const safeLodash = {
    map: _.map,
    filter: _.filter,
    reduce: _.reduce,
    cloneDeep: _.cloneDeep,
    merge: _.merge,
    isEqual: _.isEqual,
    get: _.get,
    pick: _.pick,
    omit: _.omit,
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