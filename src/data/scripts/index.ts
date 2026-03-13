import type { JDScript, DebateScript, ContractScript } from "@/types/game";
import level1Data from "./level1-jds.json";
import level2Data from "./level2-debate.json";
import level3Data from "./level3-contract.json";

export function getLevel1Scripts(): JDScript[] {
  return level1Data as JDScript[];
}

export function getLevel2Script(): DebateScript {
  return level2Data as DebateScript;
}

export function getLevel3Script(): ContractScript {
  return level3Data as ContractScript;
}
