// 👍 helper function (这是简易版，完整版看下面的classNames)
const classNames = (...args: any[]) => {
  return args.filter(Boolean).join(' ');
};

/**
 * @param {...(string|Object|Array<string|Object>)} args
 * @return {string}
 */
/*
  type ClassValue = string | number | Record<string, any> | ClassValue[];

  function classNames(...args: ClassValue[]): string {
    const results: string[] = [];

    args.forEach((arg) => {
      if (!arg) return;

      if (typeof arg === 'string' || typeof arg === 'number') {
        results.push(String(arg));
        return;
      }

      if (Array.isArray(arg)) {
        results.push(classNames(...arg));
        return;
      }

      if (typeof arg === 'object') {
        for (const [key, value] of Object.entries(arg)) {
          if (value) results.push(key);
        }
      }
    });

    return results.join(' ');
  }
*/
export default classNames;
