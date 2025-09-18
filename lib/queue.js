export class RequestQueue {
  constructor(maxConcurrent = 3, minInterval = 1000) {
    this.maxConcurrent = maxConcurrent;
    this.minInterval = minInterval;
    this.queue = [];
    this.running = 0;
    this.lastRequestTime = 0;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      setTimeout(() => this.process(), this.minInterval - timeSinceLastRequest);
      return;
    }

    const { requestFn, resolve, reject } = this.queue.shift();
    this.running++;
    this.lastRequestTime = now;

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }

  get pendingCount() {
    return this.queue.length;
  }

  get runningCount() {
    return this.running;
  }

  clear() {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}