import _ from 'lodash';

let globalAreEqual = (a: any, b: any) => _.isEqual(a, b);

/** Uses the function registered with `setAreEqual` to determine if two values are equal */
export const areEqual = (a: any, b: any) => globalAreEqual(a, b);

/** Call to override the default `areEqual` function, which uses `_.isEqual` from Lodash */
export const setAreEqual = (newAreEqual: (a: any, b: any) => boolean) => {
  globalAreEqual = newAreEqual;
};
