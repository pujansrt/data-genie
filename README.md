# Data-Genie
A lightweight and efficient **ETL Engine** in **TypeScript**, suitable for various operations.

## 📦 Features

- 🔄 Read from various data sources (CSV, JSON, FixedWidth, etc.)
- ✍️ Write to multiple formats (JSON, CSV, Console, etc.)
- ✂️ Filter and transform data with powerful field filters
- 📊 Supports complex filtering expressions
- 🔗 Chainable nd high performance operations for flexible data processing
- 🔍 Supports data validation and transformation
- 📈 Ideal for data cleaning, migration, and analysis
- 🧩 Modular design for easy integration into existing projects
- 🧪 Easy to use with TypeScript/JavaScript/Browser
- 🔒 Secure and reliable with TypeScript's type safety
- 🔧 Easy to install and get started (with examples)

## 🚀 Getting Started

### 🔧 Installation

Install from npm:

```bash
npm install @pujansrt/data-genie
```

Or, with yarn:

```bash
yarn add @pujansrt/data-genie
```

<details>
<summary>Development install (clone & build)</summary>

```bash
git clone https://github.com/pujansrt/data-genie.git
cd data-genie
npm install
npm run build
```
</details>

---

## 📚 How to use

### Example to read a CSV file, filter data, and write to console

```ts
import { ConsoleWriter, CSVReader, Job, SetCalculatedField, TransformingReader, RemoveDuplicatesReader, RemoveFields } from '@pujansrt/data-genie';

async function runExample() {
  let reader: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);
  
  reader = new RemoveDuplicatesReader(reader, 'Rating', 'CreditLimit');
  
  reader = new TransformingReader(reader)
    .add(new SetCalculatedField('AvailableCredit', 'parseFloat(record.CreditLimit) - parseFloat(record.Balance)').transform())
    .add(new RemoveFields('CreditLimit', 'Balance').transform());

  await Job.run(reader, new ConsoleWriter());
  // await Job.run(filteringReader, new JsonWriter('output/filtered-data.json'));
  // await Job.run(filteringReader, new CsvWriter('output/filtered-data.csv'));
}

runExample().catch(console.error);
```


### Example to read a CSV file, filter data, and write to JSON:

```ts
import { ConsoleWriter, CSVReader, FieldFilter, FilterExpression, FilteringReader, IsNotNull, IsType, Job, PatternMatch, ValueMatch } from "@pujansrt/data-genie";

async function runExample() {
  const reader = new CSVReader('input/example.csv').setFieldNamesInFirstRow(true);

  const filteringReader = new FilteringReader(reader)
    .add(new FieldFilter('Rating').addRule(IsNotNull()).addRule(IsType('string')).addRule(ValueMatch('B', 'C')).createRecordFilter())
    .add(new FieldFilter('Account').addRule(IsNotNull()).addRule(IsType('string')).addRule(PatternMatch('[0-9]*')).createRecordFilter())
    .add(
      new FilterExpression(
        'record.CreditLimit !== undefined && record.Balance !== undefined && parseFloat(record.CreditLimit) >= 0 && parseFloat(record.CreditLimit) <= 5000 && parseFloat(record.Balance) <= parseFloat(record.CreditLimit)'
      ).createRecordFilter()
    );

  await Job.run(filteringReader, new ConsoleWriter());
}
runExample().catch(console.error);
```

### Example to read a JSON file and transform data

```ts
import {ConsoleWriter, Job, JsonReader, SetCalculatedField, TransformingReader} from "@pujansrt/data-genie";

async function runExample() {
    let reader: any = new JsonReader('input/simple-json-input.json');

    reader = new TransformingReader(reader)
        .setCondition((record) => record.balance < 0)
        .add(new SetCalculatedField('balance', '0.0').transform()); // Using SetCalculatedField for dynamic value

    await Job.run(reader, new ConsoleWriter());
}
runExample().catch(console.error);
```

### FixedWidth Example

```ts
import {ConsoleWriter, FixedWidthReader, Job} from "@pujansrt/data-genie";

async function runExample() {
    let reader: any = new FixedWidthReader('input/credit-balance-01.fw');
    reader.setFieldWidths(8, 16, 16, 12, 14, 16, 7);
    reader.setFieldNamesInFirstRow(true);

    await Job.run(reader, new ConsoleWriter());
}
runExample().catch(console.error);
```

### Transform, Deduplicate and Fields Manipulation Example

```ts
import {ConsoleWriter, CSVReader, Job, RemoveDuplicatesReader, RemoveFields, SetCalculatedField, TransformingReader} from "@pujansrt/data-genie";

async function runExample() {
    let reader: any = new CSVReader('input/credit-balance-01.csv').setFieldNamesInFirstRow(true);
    
    reader = new RemoveDuplicatesReader(reader, 'Rating', 'CreditLimit');
    
    reader = new TransformingReader(reader)
        .add(new SetCalculatedField('AvailableCredit', 'parseFloat(record.CreditLimit) - parseFloat(record.Balance)').transform())
        .add(new RemoveFields('CreditLimit', 'Balance').transform());

    await Job.run(reader, new ConsoleWriter());
}

runExample().catch(console.error);
```

---
## 🧪 Use Cases

- Data cleaning and transformation
- Data validation and filtering
- Data migration and ETL processes
- Data analysis and reporting
- Data integration from multiple sources


## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

---

## 📜 License
MIT License — free for personal and commercial use.

---

## 👤 Author
Developed and maintained by Pujan Srivastava, a mathematician and software engineer with 18+ years of programming experience.
