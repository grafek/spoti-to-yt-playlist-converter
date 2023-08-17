export function setItem<T>(key: string, value: T) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  export function getItem<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }