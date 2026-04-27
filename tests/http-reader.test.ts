import { HttpReader } from '@/readers/http-reader';

describe('HttpReader', () => {
  it('should fetch and yield records from an API', async () => {
    const mockData = [{ id: 1, name: 'Alice' }];
    
    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const reader = new HttpReader('https://api.test.com/data');
    const results = [];
    for await (const record of reader.read()) {
      results.push(record);
    }

    expect(results).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('https://api.test.com/data', expect.any(Object));
  });

  it('should handle nested results using resultsPath', async () => {
    const mockRes = { data: { items: [{ id: 1 }] } };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRes
    });

    const reader = new HttpReader('https://api.test.com', {
      resultsPath: (res) => res.data.items
    });

    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }

    expect(results).toHaveLength(1);
  });

  it('should handle pagination using nextPageUrl', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 1 }], next: 'page2' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ id: 2 }], next: null })
      });

    const reader = new HttpReader('page1', {
      resultsPath: (res) => res.items,
      nextPageUrl: (res) => res.next
    });

    const results = [];
    for await (const r of reader.read()) {
      results.push(r);
    }

    expect(results).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
