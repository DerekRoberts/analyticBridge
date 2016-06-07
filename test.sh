rm scorecards/*.xml || true
node index.js && cat scorecards/*.xml
