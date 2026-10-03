// Type expectations for tokenize() and Tokenizer.tokenize(): the return type
// follows returnIds / returnAs, so callers need no casts.
import { tokenize, Tokenizer, type Tokenized } from "../../src/index.js";

const tuple: Tokenized = tokenize(["a cat", "a dog"]);
const tupleExplicit: Tokenized = tokenize("a cat", { returnIds: false, stopwords: "en" });
const ids: number[][] = tokenize(["a cat"], { returnIds: true });
// @ts-expect-error returnIds: true gives ids, not a Tokenized tuple
const wrong: Tokenized = tokenize(["a cat"], { returnIds: true });

const flag: boolean = Math.random() > 0.5;
const either: Tokenized | number[][] = tokenize(["a cat"], { returnIds: flag });

const tokenizer = new Tokenizer({ stopwords: "en" });
const defaultIds: number[][] = tokenizer.tokenize(["a cat"]);
const asIds: number[][] = tokenizer.tokenize(["a cat"], { returnAs: "ids", updateVocab: false });
const asTuple: Tokenized = tokenizer.tokenize(["a cat"], { returnAs: "tuple" });
// @ts-expect-error the default return is ids
const wrongDefault: Tokenized = tokenizer.tokenize(["a cat"]);

console.log(tuple, tupleExplicit, ids, wrong, either, defaultIds, asIds, asTuple, wrongDefault);
