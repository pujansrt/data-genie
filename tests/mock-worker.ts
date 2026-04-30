import { setupWorker } from '@/writers/parallel-writer';
import { MemoryWriter } from '@/writers/memory-writer';

// In a real scenario, this would be your production writer (SQLWriter, etc.)
const internalWriter = new MemoryWriter();

setupWorker(internalWriter);
