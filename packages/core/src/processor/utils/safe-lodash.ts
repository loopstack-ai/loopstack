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

Object.freeze(safeLodash);
Object.keys(safeLodash).forEach((key) => {
    Object.freeze(safeLodash[key]);
});

export default safeLodash;