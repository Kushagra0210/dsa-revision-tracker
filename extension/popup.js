const TRACKER_URL = "https://dsa-revision-tracker-five.vercel.app";
const $ = (id) => document.getElementById(id);
const status = (text) => $("status").textContent = text;
const random = (prefix) => `${prefix}${crypto.getRandomValues(new Uint8Array(32)).reduce((out, byte) => out + byte.toString(16).padStart(2, "0"), "")}`;
$("connect").onclick = async () => {
  const granted = await chrome.permissions.request({ origins: [`${new URL(TRACKER_URL).origin}/*`] });
  if (!granted) return status("Allow tracker access to connect.");
  const pairingCode = random("pair_"); const token = random("dsa_lt_");
  await chrome.storage.local.set({ trackerUrl: TRACKER_URL, token, pairingCode });
  await chrome.tabs.create({ url: `${TRACKER_URL}/integrations/leetcode/connect#pair=${pairingCode}&token=${token}` });
  status("Finish the connection in the tracker tab.");
};
$("add").onclick = async () => {
  const { trackerUrl, token } = await chrome.storage.local.get(["trackerUrl", "token"]);
  if (!trackerUrl || !token) return status("Click Connect tracker first.");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("leetcode.com/problems/")) return status("Open a LeetCode problem first.");
  const payload = await chrome.tabs.sendMessage(tab.id, { type: "CURRENT_PROBLEM" });
  if (!payload?.problemNumber || !payload?.title) return status("Couldn't read this problem. Add it manually in the tracker.");
  status("Adding…");
  const response = await fetch(`${trackerUrl}/api/integrations/leetcode/submissions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const result = await response.json();
  status(response.status === 201 ? "Added — revision schedule created." : (result.message || result.error || "Could not add this problem."));
};
