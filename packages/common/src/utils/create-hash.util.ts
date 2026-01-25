import murmurhash from 'murmurhash';

export const createHash = (subject: any): string => {
  const jsonString = JSON.stringify(subject);
  return murmurhash.v3(jsonString).toString();
};
