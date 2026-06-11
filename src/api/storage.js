


const store = {};

export const Storage = {
  getItem:    (key)        => store[key] ?? null,
  setItem:    (key, value) => { store[key] = value; },
  removeItem: (key)        => { delete store[key]; },
};

