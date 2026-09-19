const $ = (id) => document.getElementById(id);
const status = (text) => $("status").textContent = text;
chrome.storage.local.get(["trackerUrl", "token"], (saved) => { $("url").value = saved.trackerUrl || ""; $("token").value = saved.token || ""; });
$("save").onclick = async () => {
  const trackerUrl = $("url").value.replace(/\/$/, "");
  let origin;
  try { origin = new URL(trackerUrl).origin; } catch { return status("Enter a valid tracker URL."); }
  const granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) return status("Allow access to your tracker URL to connect the extension.");
  chrome.storage.local.set({ trackerUrl, token: $("token").value });
  status("Saved locally in this browser.");
};
$("add").onclick = async () => {
  const { trackerUrl, token } = await chrome.storage.local.get(["trackerUrl", "token"]);
  if (!trackerUrl || !token) return status("Save your tracker URL and companion token first.");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.includes("leetcode.com/problems/")) return status("Open a LeetCode problem first.");
  const payload = await chrome.tabs.sendMessage(tab.id, { type: "CURRENT_PROBLEM" });
  if (!payload?.problemNumber || !payload?.title) return status("Couldn't read this problem. Add it manually in the tracker.");
  status("Adding…");
  const response = await fetch(`${trackerUrl}/api/integrations/leetcode/submissions`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
  const result = await response.json();
  status(response.status === 201 ? "Added — revision schedule created." : (result.message || result.error || "Could not add this problem."));
};
