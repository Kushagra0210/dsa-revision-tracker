"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/field";

const TOPICS = [
  "Array", "String", "Binary Search", "Dynamic Programming", "Graph", "Tree",
  "Linked List", "Stack", "Queue", "Heap", "Greedy", "Backtracking",
  "Two Pointers", "Sliding Window", "Hash Table", "Math", "Bit Manipulation", "Trie",
];

export function ProblemFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const urlSearch = params.get("q") ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <input
          key={urlSearch}
          defaultValue={urlSearch}
          onKeyDown={(event) => {
            if (event.key === "Enter") update("q", event.currentTarget.value);
          }}
          onBlur={(event) => update("q", event.currentTarget.value)}
          placeholder="Search number, title, topic…"
          className="h-9 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      <Select
        aria-label="Status"
        defaultValue={params.get("status") ?? "ALL"}
        onChange={(event) => update("status", event.target.value)}
        className="w-auto"
      >
        <option value="ALL">All statuses</option>
        <option value="DUE">Due</option>
        <option value="OVERDUE">Overdue</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="COMPLETED">Completed</option>
      </Select>
      <Select
        aria-label="Platform"
        defaultValue={params.get("platform") ?? "ALL"}
        onChange={(event) => update("platform", event.target.value)}
        className="w-auto"
      >
        <option value="ALL">All platforms</option>
        <option value="LEETCODE">LeetCode</option>
        <option value="CODEFORCES">Codeforces</option>
        <option value="HACKERRANK">HackerRank</option>
        <option value="GEEKSFORGEEKS">GeeksforGeeks</option>
        <option value="OTHER">Other</option>
      </Select>
      <Select
        aria-label="Difficulty"
        defaultValue={params.get("difficulty") ?? "ALL"}
        onChange={(event) => update("difficulty", event.target.value)}
        className="w-auto"
      >
        <option value="ALL">All difficulties</option>
        <option value="EASY">Easy</option>
        <option value="MEDIUM">Medium</option>
        <option value="HARD">Hard</option>
      </Select>
      <Select
        aria-label="Topic"
        defaultValue={params.get("topic") ?? "ALL"}
        onChange={(event) => update("topic", event.target.value)}
        className="w-auto"
      >
        <option value="ALL">All topics</option>
        {TOPICS.map((topic) => (
          <option key={topic} value={topic}>
            {topic}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Sort"
        defaultValue={params.get("sort") ?? "registered"}
        onChange={(event) => update("sort", event.target.value)}
        className="w-auto"
      >
        <option value="registered">Newest first</option>
        <option value="nextRevision">Next revision</option>
        <option value="difficulty">Difficulty</option>
      </Select>
    </div>
  );
}
