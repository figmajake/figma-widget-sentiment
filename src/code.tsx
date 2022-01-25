const SentimentAnalysis = require("sentiment");
const sentiment = new SentimentAnalysis();
const { currentPage, widget } = figma;
const { useEffect, useSyncedMap, useSyncedState, AutoLayout, Text } = widget;

type ValidNonTextNode = StickyNode | ShapeWithTextNode;
type ValidNode = ValidNonTextNode | TextNode;

const isValidNonTextNode = (node: SceneNode): node is ValidNonTextNode =>
  node.type === "STICKY" || node.type === "SHAPE_WITH_TEXT";
const isValidTextNode = (node: SceneNode): node is TextNode =>
  node.type === "TEXT";
const isValidNode = (node: SceneNode): node is TextNode | ValidNonTextNode =>
  isValidNonTextNode(node) || isValidTextNode(node);

function Sentiment() {
  const [running, setRunning] = useSyncedState<boolean>("running", false);
  const [score, setScore] = useSyncedState<number>("score", 0);
  const wordsMap = useSyncedMap<number>("words");
  useEffect(() => {
    figma.ui.onmessage = () => runSentimentAnalysisLoop();
  });

  const runSentimentAnalysis = (tryUsingSelection = false) => {
    wordsMap.keys().forEach((key) => wordsMap.delete(key));
    setScore(0);
    const selected: ValidNode[] = tryUsingSelection
      ? currentPage.selection.filter(isValidNode)
      : [];
    const nodes = selected.length
      ? selected
      : currentPage.findAllWithCriteria({
          types: ["STICKY", "SHAPE_WITH_TEXT", "TEXT"],
        });
    let count = 0;
    let avg = 0;
    nodes.forEach((node) => {
      const chars = isValidTextNode(node)
        ? node.characters
        : node.text.characters;
      const value = chars.toLowerCase().trim();
      if (value) {
        const result = sentiment.analyze(value);
        const { calculation } = result;
        if (calculation.length) {
          calculation.forEach((hash: { [k: string]: number }) => {
            for (let word in hash) {
              avg += hash[word] || 0;
              count++;
              wordsMap.set(word, (wordsMap.get(word) || 0) + 1);
            }
          });
        }
      }
    });
    const rawScore = avg / count / 5;
    const posNeg = rawScore < 0 ? -1 : 1;
    const adjustedScore = Math.pow(Math.abs(rawScore), 0.5) * posNeg;
    const realScore = isNaN(adjustedScore) ? 0 : adjustedScore;
    setScore(realScore);
    console.log("Sentiment Data", {
      score: realScore,
      words: wordsMap.entries().sort((a, b) => b[1] - a[1]),
    });
  };

  const runSentimentAnalysisLoop = () => {
    runSentimentAnalysis();
    if (running) {
      setTimeout(() => {
        figma.ui.postMessage("go");
      }, 1000);
    }
  };

  const handleClick = () => {
    if (running) {
      setRunning(false);
    } else {
      setRunning(true);
      setTimeout(() => {
        figma.ui.postMessage("go");
      }, 100);
      return new Promise(() =>
        figma.showUI(
          `<script>
    window.onmessage = async (event) => {
      parent.postMessage({ pluginMessage: "go" }, "*");
    }
    </script>`,
          { visible: false }
        )
      );
    }
  };

  // const widthR1 = score > 0 ? 0.5 : 0.5 - Math.abs(score) * 0.5;
  // const widthR2 = score > 0 ? score * 0.5 : 0.5 - widthR1;
  // const realWidth = 200;
  // const width1 = widthR1 * realWidth;
  // const width2 = widthR2 * realWidth;
  const emojiSpectrum = ["😭", "😩", "😣", "😕", "😐", "🙂", "😊", "😁", "😍"];
  const emojiIndex = Math.floor(emojiSpectrum.length * ((score + 1) / 2));
  const elementShadow: WidgetJSX.Effect = {
    type: "drop-shadow",
    blur: 2,
    offset: { x: 0, y: 1 },
    color: "#cdd3db",
  };

  return (
    <AutoLayout
      cornerRadius={8}
      direction="vertical"
      effect={{
        type: "drop-shadow",
        blur: 4,
        offset: { x: 0, y: 2 },
        color: "#cdd3db",
      }}
      fill="#fff"
      horizontalAlignItems="center"
      padding={16}
      spacing={8}
      stroke="#f8f8f8"
      strokeWidth={1}
    >
      <AutoLayout
        horizontalAlignItems="center"
        spacing={4}
        verticalAlignItems="center"
      >
        {emojiSpectrum.map((emoji, index) => (
          <Text
            key={emoji}
            opacity={index === emojiIndex ? 1 : 0.4}
            fontSize={index === emojiIndex ? 32 : 16}
          >
            {emoji}
          </Text>
        ))}
      </AutoLayout>
      {/* <AutoLayout cornerRadius={4} fill="#222" height={4} width={realWidth}>
        {width1 > 0.01 ? <AutoLayout width={width1}></AutoLayout> : null}
        {width2 > 0.01 ? (
          <AutoLayout
            width={width2}
            fill={
              Math.abs(score) < 0.25
                ? "#ffc500"
                : score > 0
                ? "#00ad4d"
                : "#ff3b00"
            }
          ></AutoLayout>
        ) : null}
      </AutoLayout> */}
      <AutoLayout direction="horizontal" spacing={8} width="fill-parent">
        <AutoLayout
          cornerRadius={30}
          effect={elementShadow}
          fill={running ? "#ff3b00" : "#222"}
          horizontalAlignItems="center"
          onClick={handleClick}
          padding={8}
          width="fill-parent"
        >
          <Text fontWeight="extra-bold" fill="#fff" fontSize={14}>
            {running ? "Stop" : "Start"}
          </Text>
        </AutoLayout>
        {running ? null : (
          <AutoLayout
            cornerRadius={30}
            effect={elementShadow}
            fill="#222"
            horizontalAlignItems="center"
            onClick={() => runSentimentAnalysis(true)}
            padding={8}
            width="fill-parent"
          >
            <Text fontWeight="extra-bold" fill="#fff" fontSize={14}>
              Once
            </Text>
          </AutoLayout>
        )}
      </AutoLayout>
      <AutoLayout
        cornerRadius={12}
        fill={
          Math.abs(score) < 0.25 ? "#ffc500" : score > 0 ? "#00ad4d" : "#ff3b00"
        }
        padding={{ top: 4, bottom: 4, left: 8, right: 8 }}
      >
        <Text fontWeight="extra-bold" fontSize={12} fill="#FFF">
          {score.toFixed(3)}
        </Text>
      </AutoLayout>
    </AutoLayout>
  );
}

widget.register(Sentiment);
