import { describe, expect, it } from "vitest";
import { matchesKeywords, normalize, parseKeywords } from "./text";

describe("normalize", () => {
  it("tira acento, maiúscula e pontuação", () => {
    expect(normalize("  Cardápio!!  QUERO, por favor ")).toBe("cardapio quero por favor");
  });
});

describe("parseKeywords", () => {
  it("separa por vírgula/linha e remove repetidas", () => {
    expect(parseKeywords("QUERO, quero\nCardápio;  ")).toEqual(["quero", "cardapio"]);
  });
});

describe("matchesKeywords", () => {
  it("contains casa palavra inteira, sem acento", () => {
    expect(matchesKeywords("Eu quero o cardapio!", ["cardápio"].map(normalize), "contains")).toBe(true);
    expect(matchesKeywords("QUERO", ["quero"], "contains")).toBe(true);
  });
  it("contains não casa pedaço de palavra", () => {
    expect(matchesKeywords("queroo", ["quero"], "contains")).toBe(false);
    expect(matchesKeywords("meu", ["eu"], "contains")).toBe(false);
  });
  it("contains casa expressão com várias palavras", () => {
    expect(matchesKeywords("oi, quero o link agora", ["quero o link"], "contains")).toBe(true);
  });
  it("exact exige o texto inteiro", () => {
    expect(matchesKeywords("Quero!", ["quero"], "exact")).toBe(true);
    expect(matchesKeywords("eu quero", ["quero"], "exact")).toBe(false);
  });
  it("sem palavras-chave casa qualquer coisa", () => {
    expect(matchesKeywords("qualquer", [], "contains")).toBe(true);
  });
});
