const SentimentAnalysis = require("sentiment");
const sentiment = new SentimentAnalysis();
const { currentPage, widget } = figma;
const { useSyncedMap, useSyncedState, AutoLayout, Text } = widget;

type ValidNonTextNode = StickyNode | ShapeWithTextNode;
type ValidNode = ValidNonTextNode | TextNode;

const isValidNonTextNode = (node: SceneNode): node is ValidNonTextNode =>
  node.type === "STICKY" || node.type === "SHAPE_WITH_TEXT";
const isValidTextNode = (node: SceneNode): node is TextNode =>
  node.type === "TEXT";
const isValidNode = (node: SceneNode): node is TextNode | ValidNonTextNode =>
  isValidNonTextNode(node) || isValidTextNode(node);

function Sentiment() {
  const [score, setScore] = useSyncedState<number>("score", 0);
  const sentimentsMap =
    useSyncedMap<{ words: string[]; score: number }>("sentiments");
  const wordsMap = useSyncedMap<number>("words");
  const run = () => {
    wordsMap.keys().forEach((key) => wordsMap.delete(key));
    setScore(0);
    const selected: ValidNode[] = currentPage.selection.filter(isValidNode);
    const nodes = selected.length
      ? selected
      : currentPage.findAllWithCriteria({
          types: ["STICKY", "SHAPE_WITH_TEXT", "TEXT"],
        });
    let count = 0;
    let avg = 0;
    nodes.forEach((node) => {
      const value = (
        isValidTextNode(node) ? node.characters : node.text.characters
      )
        .toLowerCase()
        .trim();
      if (value) {
        const result = sentiment.analyze(value);
        const { words, score } = result;
        if (words.length) {
          console.log(result);
          avg += score;
          count++;
          words.forEach((word: string) => {
            wordsMap.set(word, (wordsMap.get(word) || 0) + 1);
          });
          sentimentsMap.set(node.id, { words, score });
        }
      }
    });
    setScore(avg / count);
  };

  const sortedWords = wordsMap
    .entries()
    .sort((a, b) => b[1] - a[1])
    .map(([word, instances]) => `${word} (${instances})`);

  return (
    <AutoLayout direction="vertical" spacing={8}>
      <AutoLayout fill="#000" padding={8} onClick={run}>
        <Text fill="#fff">Get Sentiment</Text>
      </AutoLayout>
      <Text>{score.toFixed(1)}</Text>
      <Text>{sortedWords.join("\n")}</Text>
    </AutoLayout>
  );
}

widget.register(Sentiment);
