// Runs only after the user opens the extension on a LeetCode problem page.
// It does not observe submissions, read cookies, or make network requests.
chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type !== "CURRENT_PROBLEM") return;
  const path = location.pathname.match(/^\/problems\/([^/]+)/);
  const heading = document.querySelector("h1")?.textContent?.trim() || "";
  const match = heading.match(/^(\d+)\.\s*(.+)$/);
  const difficultyText = [...document.querySelectorAll("div,span")]
    .map((node) => node.textContent?.trim()).find((text) => /^(Easy|Medium|Hard)$/.test(text || ""));
  respond({
    problemNumber: match?.[1] || path?.[1] || "",
    title: match?.[2] || heading,
    difficulty: difficultyText?.toUpperCase(),
    url: location.href.split("?")[0],
  });
});
