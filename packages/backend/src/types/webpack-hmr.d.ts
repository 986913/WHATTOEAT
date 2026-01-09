declare const module: {
  hot?: {
    accept(callback?: () => void): void;
    dispose(callback: () => void): void;
  };
};
