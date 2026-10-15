import { beforeEach, describe, expect, it, vi } from "vitest";

const executed: string[] = [];
let answer: string | undefined;
const asked: string[] = [];

vi.mock("vscode", () => ({
  commands: { executeCommand: async (command: string) => { executed.push(command); } },
  window: {
    showInformationMessage: async (text: string, ...items: string[]) => {
      asked.push(text);
      return items.includes(answer ?? "") ? answer : undefined;
    },
  },
}));

import { offerLayoutRepair, restoreLayout, revealAgentPanel } from "../src/extension";

const memento = (seed: Record<string, unknown> = {}) => {
  const values = new Map(Object.entries(seed));
  return {
    get: (key: string) => values.get(key),
    keys: () => [...values.keys()],
    update: async (key: string, value: unknown) => { values.set(key, value); },
    values,
  };
};

describe("panel layout (K17)", () => {
  beforeEach(() => { executed.length = 0; asked.length = 0; answer = undefined; });

  it("only focuses the panel; it never moves Kiro's bottom panel or any view", async () => {
    await revealAgentPanel();
    expect(executed).toEqual(["builderHelperAgentPanel.view.focus"]);
  });

  it("offers the layout reset once after an upgrade and runs it only when chosen", async () => {
    const upgraded = memento({ "vibeHelper.commandApproval": "PREAPPROVED" });
    answer = "원래 배치로 되돌리기";
    await offerLayoutRepair({ globalState: upgraded as never });
    expect(asked).toHaveLength(1);
    expect(executed).toEqual(["workbench.action.resetViewLocations"]);
    await offerLayoutRepair({ globalState: upgraded as never });
    expect(asked).toHaveLength(1);

    const declined = memento({ "bhlr.lastProjectId": "project_1" });
    answer = undefined;
    executed.length = 0;
    await offerLayoutRepair({ globalState: declined as never });
    expect(asked).toHaveLength(2);
    expect(executed).toEqual([]);
  });

  it("names the palette command in the one-time offer", async () => {
    await offerLayoutRepair({ globalState: memento({ "vibeHelper.commandApproval": "PREAPPROVED" }) as never });
    expect(asked[0]).toContain("Vibe Helper: Restore Kiro Layout");
  });

  it("resets the layout from the palette command every time, only after the learner agrees", async () => {
    answer = "되돌리기";
    await restoreLayout();
    await restoreLayout();
    expect(asked).toHaveLength(2);
    expect(executed).toEqual(["workbench.action.resetViewLocations", "workbench.action.resetViewLocations"]);

    answer = undefined;
    executed.length = 0;
    await restoreLayout();
    expect(executed).toEqual([]);
  });

  it("does not ask on a fresh install", async () => {
    const fresh = memento();
    await offerLayoutRepair({ globalState: fresh as never });
    expect(asked).toEqual([]);
    expect(fresh.values.get("vibeHelper.layoutRepairOffered")).toBe(true);
  });
});
