const worker = new Worker(
  "./katago-test/assets/worker-DzsLrmAN.js",
  { type: "module" }
);

worker.onmessage = e => {
  if (e.data.type === "katago:analyze_result") {
    const best = e.data.analysis?.moves?.[0];
    alert(
      "AI推荐落子:\n" +
      JSON.stringify(best) +
      "\n访问次数:" +
      e.data.analysis.rootVisits
    );
  } else {
    alert(JSON.stringify(e.data));
  }
};

worker.onerror = e => {
  alert(
    "Worker错误\n" +
    "message: " + e.message + "\n" +
    "filename: " + e.filename + "\n" +
    "lineno: " + e.lineno
  );
};

worker.postMessage({
  type: "katago:init",
  modelUrl: "/games/go/katago-test/models/katago-small.bin.gz"
});

setTimeout(() => {
  const board = Array.from({length:19},()=>Array(19).fill(null));

  worker.postMessage({
    type:"katago:analyze",
    id:1,
    board:board,
    currentPlayer:"black",
    moveHistory:[],
    komi:7.5,
    rules:{
      koRule:"simple",
      scoringRule:"area",
      taxRule:"none",
      multiStoneSuicideLegal:false
    },
    modelUrl:"/games/go/katago-test/models/katago-small.bin.gz",
    visits:50,
    maxTimeMs:3000
  });
},3000);
