import { TreeGraphData as G6TreeGraphData } from "@antv/g6";

export type NodeType = "Action" | "Composite" | "Decorator" | "Condition" | "Other" | "Error";

export interface NodeArg {
  name: string;
  type:
  | "boolean"
  | "boolean?"
  | "boolean[]"
  | "boolean[]?"
  | "int"
  | "int?"
  | "int[]"
  | "int[]?"
  | "float"
  | "float?"
  | "float[]"
  | "float[]?"
  | "string"
  | "string?"
  | "string[]"
  | "string[]?"
  | "json"
  | "json?"
  | "json[]"
  | "json[]?"
  | "enum"
  | "enum?"
  | "enum[]"
  | "enum[]?"
  | "code"
  | "code?"
  | "code[]"
  | "code[]?";
  desc: string;
  tip: string;
  oneof?: string;
  default?: unknown;
  options?: { name: string; value: string | number }[];
}

export interface NodeDef {
  name: string;
  type: NodeType;
  desc?: string;
  args?: NodeArg[];
  input?: string[];
  output?: string[];
  doc?: string;
  color?: string;
  icon?: string;
  /**
   * + `!success`  !(child_success|child_success|...)
   * + `!failure`  !(child_failure|child_failure|...)
   * + `|success`  child_success|child_success|...
   * + `|failure`  child_failure|child_failure|...
   * + `|running`  child_running|child_running|...
   * + `&success`  child_success&child_success&...
   * + `&failure`  child_failure&child_failure&...
   */
  status?: (
    | "success"
    | "failure"
    | "running"
    | "!success"
    | "!failure"
    | "|success"
    | "|failure"
    | "|running"
    | "&success"
    | "&failure"
  )[];
  children?: -1 | 0 | 1;
}

export interface NodeModel {
  id: number;
  name: string;
  desc?: string;
  args?: { [key: string]: any };
  input?: string[];
  output?: string[];
  children?: NodeModel[];
  debug?: boolean;
  disabled?: boolean;
  path?: string;
}

export interface TreeModel {
  name: string;
  desc?: string;
  export?: boolean;
  root: NodeModel;
}

export interface TreeGraphData extends G6TreeGraphData {
  name: string;
  desc?: string;
  args?: { [key: string]: any };
  input?: string[];
  output?: string[];
  children?: TreeGraphData[];
  def: NodeDef;
  debug?: boolean;
  disabled?: boolean;
  parent?: string;
  path?: string;
  lastModified?: number;

  size?: number[];
  highlightInput?: boolean;
  highlightOutput?: boolean;
  highlightGray?: boolean;
  status?: number;
}

export const unknownNodeDef: NodeDef = {
  name: "unknown",
  desc: "新建节点",
  type: "Action",
};

export const getNodeType = (def: NodeDef): NodeType => {
  const type = def.type.toLocaleLowerCase().toString();
  if (type.startsWith("action")) {
    return "Action";
  } else if (type.startsWith("composite")) {
    return "Composite";
  } else if (type.startsWith("decorator")) {
    return "Decorator";
  } else if (type.startsWith("condition")) {
    return "Condition";
  } else {
    return "Other";
  }
};
