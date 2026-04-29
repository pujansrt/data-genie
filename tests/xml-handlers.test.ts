import { MemorySink, MemorySource } from '@/core/memory-transport';
import { XMLReader } from '@/readers/xml-reader';
import { XMLWriter } from '@/writers/xml-writer';

describe('XML Handlers', () => {
  const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<library>
  <book id="1">
    <title lang="eng">Harry Potter</title>
    <price>29.99</price>
  </book>
  <book id="2">
    <title lang="eng">Learning XML</title>
    <price>39.95</price>
  </book>
</library>`;

  it('should read XML correctly', async () => {
    const source = new MemorySource(xmlData);
    const reader = new XMLReader(source, {
      recordPath: 'library/book',
      includeAttributes: true,
    });

    const records = [];
    for await (const record of reader.read()) {
      records.push(record);
    }

    expect(records).toHaveLength(2);
    expect(records[0]).toEqual({
      '@id': '1',
      title: { '@lang': 'eng', '#text': 'Harry Potter' },
      price: '29.99',
    });
    expect(records[1]).toEqual({
      '@id': '2',
      title: { '@lang': 'eng', '#text': 'Learning XML' },
      price: '39.95',
    });
  });

  it('should write XML correctly', async () => {
    const records = [
      { name: 'John Wayne', balance: 156.35 },
      { name: 'Peter Parker', balance: -0.96 }
    ];

    async function* recordGenerator() {
      for (const record of records) {
        yield record;
      }
    }

    const sink = new MemorySink();
    const writer = new XMLWriter(sink, {
      rootTag: 'actors',
      recordTag: 'actor',
    });

    await writer.writeAll(recordGenerator());
    await writer.close();

    const outputXml = sink.getData().toString();
    expect(outputXml).toContain('<actors>');
    expect(outputXml).toContain('<actor>');
    expect(outputXml).toContain('<name>John Wayne</name>');
    expect(outputXml).toContain('<balance>156.35</balance>');
    expect(outputXml).toContain('</actors>');
  });

  it('should handle namespace stripping and deep paths', async () => {
    const namespacedXml = `
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <m:GetStockPriceResponse xmlns:m="http://www.example.org/stock">
            <m:Price>34.50</m:Price>
          </m:GetStockPriceResponse>
        </soap:Body>
      </soap:Envelope>
    `;
    const source = new MemorySource(namespacedXml);
    const reader = new XMLReader(source, {
      recordPath: '//GetStockPriceResponse',
      stripNamespaces: true,
      includeAttributes: false
    });

    const records = [];
    for await (const record of reader.read()) {
      records.push(record);
    }

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ Price: '34.50' });
  });
});
