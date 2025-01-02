import { FileTreeType, useWorkspace } from "@/contexts/workspace-context";
import { NodeDef, getNodeType } from "@/misc/b3type";
import * as b3util from "@/misc/b3util";
import { modal } from "@/misc/hooks";
import i18n from "@/misc/i18n";
import { Hotkey, isMacos, useKeyDown } from "@/misc/keys";
import Path from "@/misc/path";
import { DownOutlined } from "@ant-design/icons";
import { Button, Dropdown, Flex, FlexProps, Input, MenuProps, Space, Tree } from "antd";
import { ItemType } from "antd/es/menu/interface";
import { ipcRenderer } from "electron";
import * as fs from "fs";
import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BsBoxFill } from "react-icons/bs";
import { FaExclamationTriangle, FaSwatchbook } from "react-icons/fa";
import { FiCommand, FiDelete } from "react-icons/fi";
import { IoMdReturnLeft } from "react-icons/io";
import { PiTreeStructureFill } from "react-icons/pi";

const { DirectoryTree } = Tree;

type MenuInfo = Parameters<Exclude<MenuProps["onClick"], undefined>>[0];
type MenuEvent =
  | "open"
  | "newFile"
  | "newFolder"
  | "revealFile"
  | "rename"
  | "delete"
  | "paste"
  | "copy"
  | "move"
  | "duplicate";

export type NodeTreeType = {
  title: string;
  path: string;
  def?: NodeDef;
  icon?: React.ReactNode;
  isLeaf?: boolean;
  children?: NodeTreeType[];
  style?: React.CSSProperties;
};

const findFile = (path: string | undefined, node: FileTreeType): FileTreeType | undefined => {
  if (!path) {
    return;
  } else if (node.path === path) {
    return node;
  }
  if (node.children) {
    for (const child of node.children) {
      const ret = findFile(path, child);
      if (ret) {
        return ret;
      }
    }
  }
};

const findParent = (node: FileTreeType, parent?: FileTreeType): FileTreeType | undefined => {
  if (parent && parent.children) {
    if (parent.children?.indexOf(node) >= 0) {
      return parent;
    }
    for (const child of parent.children) {
      const v = findParent(node, child);
      if (v) {
        return v;
      }
    }
  }
};

const resolveKeys = (path: string, node: FileTreeType | NodeTreeType, keys: React.Key[]) => {
  if (node.path === path) {
    return true;
  }
  if (node.children) {
    keys.push(node.path);
    for (const child of node.children) {
      if (resolveKeys(path, child, keys)) {
        return true;
      }
    }
    keys.pop();
  }
  return false;
};

// rename file
const renameFile = (oldPath: string, newPath: string) => {
  const workspace = useWorkspace.getState();
  if (fs.existsSync(newPath)) {
    return false;
  } else if (oldPath !== newPath) {
    try {
      fs.renameSync(oldPath, newPath);
      const isDirectory = fs.statSync(newPath).isDirectory();
      for (const editor of workspace.editors) {
        if (isDirectory) {
          if (editor.path.startsWith(oldPath)) {
            editor.dispatch("rename", editor.path.replace(oldPath, newPath));
          }
        } else {
          if (editor.path === oldPath) {
            editor.dispatch("rename", newPath);
          }
        }
      }
      return true;
    } catch (e) {
      console.error(e);
    }
  }
  return false;
};

// file context menu
const createFileContextMenu = (node: FileTreeType) => {
  const isTreeFile = b3util.isTreeFile(node.path);
  const MenuItem: FC<FlexProps> = (itemProps) => {
    return (
      <Flex
        gap="50px"
        style={{ minWidth: "200px", justifyContent: "space-between", alignItems: "center" }}
        {...itemProps}
      ></Flex>
    );
  };

  const arr: MenuProps["items"] = [
    {
      disabled: !isTreeFile,
      label: (
        <MenuItem>
          <div>{i18n.t("open")}</div>
        </MenuItem>
      ),
      key: "open",
    },
    {
      disabled: !isTreeFile,
      label: (
        <MenuItem>
          <div>{i18n.t("copy")}</div>
          <div>{isMacos ? "⌘ C" : "Ctrl+C"}</div>
        </MenuItem>
      ),
      key: "copy",
    },
    {
      disabled: !isTreeFile,
      label: (
        <MenuItem>
          <div>{i18n.t("duplicate")}</div>
          <div>{isMacos ? "⌘ D" : "Ctrl+D"}</div>
        </MenuItem>
      ),
      key: "duplicate",
    },
    {
      label: (
        <MenuItem>
          <div>{isMacos ? i18n.t("revealFileOnMac") : i18n.t("revealFileOnWindows")}</div>
        </MenuItem>
      ),
      key: "revealFile",
    },
    {
      label: (
        <MenuItem>
          <div>{i18n.t("rename")}</div>
          {isMacos && <IoMdReturnLeft />}
          {!isMacos && <div>F2</div>}
        </MenuItem>
      ),
      key: "rename",
    },
    {
      label: (
        <MenuItem>
          <div>{i18n.t("delete")}</div>
          {isMacos && (
            <Space size={6}>
              <FiCommand />
              <FiDelete />
            </Space>
          )}
        </MenuItem>
      ),
      key: "delete",
    },
  ];
  return arr;
};

// folder context menu
const createFolderContextMenu = (copiedPath: string) => {
  const MenuItem: FC<FlexProps> = (itemProps) => {
    return (
      <Flex
        gap="50px"
        style={{ minWidth: "200px", justifyContent: "space-between", alignItems: "center" }}
        {...itemProps}
      ></Flex>
    );
  };

  const arr: MenuProps["items"] = [
    {
      label: (
        <MenuItem>
          <div>{i18n.t("newFile")}</div>
        </MenuItem>
      ),
      key: "newFile",
    },
    {
      label: (
        <MenuItem>
          <div>{i18n.t("newFolder")}</div>
        </MenuItem>
      ),
      key: "newFolder",
    },
    {
      label: (
        <MenuItem>
          <div>{isMacos ? i18n.t("revealFileOnMac") : i18n.t("revealFileOnWindows")}</div>
        </MenuItem>
      ),
      key: "revealFile",
    },
    {
      disabled: !copiedPath,
      label: (
        <MenuItem>
          <div>{i18n.t("paste")}</div>
          <div>{isMacos ? "⌘ V" : "Ctrl+V"}</div>
        </MenuItem>
      ),
      key: "paste",
    },
    {
      label: (
        <MenuItem>
          <div>{i18n.t("rename")}</div>
          {isMacos && <IoMdReturnLeft />}
          {!isMacos && <div>F2</div>}
        </MenuItem>
      ),
      key: "rename",
    },
    {
      label: (
        <MenuItem>
          <div>{i18n.t("delete")}</div>
          {isMacos && (
            <Space size={6}>
              <FiCommand />
              <FiDelete />
            </Space>
          )}
        </MenuItem>
      ),
      key: "delete",
    },
  ];
  return arr;
};

export const Explorer: FC = () => {
  const workspace = {
    close: useWorkspace((state) => state.close),
    editing: useWorkspace((state) => state.editing),
    editingNodeDef: useWorkspace((state) => state.editingNodeDef),
    editors: useWorkspace((state) => state.editors),
    fileTree: useWorkspace((state) => state.fileTree),
    nodeDefs: useWorkspace((state) => state.nodeDefs),
    workdir: useWorkspace((state) => state.workdir),
    onEditingNodeDef: useWorkspace((state) => state.onEditingNodeDef),
    open: useWorkspace((state) => state.open),
    getTypeDef: useWorkspace((state) => state.getTypeDef),
  };
  const { t } = useTranslation();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(
    workspace.fileTree?.path ? [workspace.fileTree.path] : []
  );
  const [copyFile, setCopyFile] = useState("");
  const [newName, setNewName] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ItemType[]>([]);

  const rootNodedefName = "nodeTree.root";
  const [selectedNodedefKeys, setSelectedNodedefKeys] = useState<string[]>([]);
  const [expandedNodedefKeys, setExpandedNodedefKeys] = useState<React.Key[]>([rootNodedefName]);

  if (workspace.fileTree) {
    workspace.fileTree.icon = (
      <Flex justify="center" align="center" style={{ height: "100%" }}>
        <FaSwatchbook />
      </Flex>
    );
  }

  const nodeTree = useMemo(() => {
    const data: NodeTreeType = {
      title: t("nodeDefinition"),
      path: rootNodedefName,
      icon: (
        <Flex justify="center" align="center" style={{ height: "100%" }}>
          <PiTreeStructureFill size={19} />
        </Flex>
      ),
      children: [],
      style: {
        fontWeight: "bold",
        fontSize: "13px",
      },
    };
    workspace.nodeDefs.forEach((nodeDef) => {
      let catalog = data.children?.find((nt) => nt.title === nodeDef.type);
      let typeDef = workspace.getTypeDef(nodeDef.type);

      if (!catalog) {
        const type = getNodeType(nodeDef);
        catalog = {
          title: nodeDef.type,
          path: `nodeTree.catalog.${nodeDef.type}`,
          children: [],
          icon: (
            <Flex justify="center" align="center" style={{ height: "100%" }}>
              <img
                className="b3-node-icon"
                style={{ width: "13px", height: "13px", color: "white" }}
                src={`file:///${workspace.workdir}/${typeDef?.icon}`}
              />
            </Flex>
          ),
        };
        data.children?.push(catalog);
      }
      catalog.children?.push({
        title: `${nodeDef.name}`,
        isLeaf: true,
        def: nodeDef,
        path: `${nodeDef.name}`,
        icon: nodeDef.icon || typeDef?.icon
          ? (
            <Flex justify="center" align="center" style={{ height: "100%" }}>
              <img
                className="b3-node-icon"
                key={catalog.title}
                style={{ width: "13px", height: "13px", color: "white" }}
                src={`file:///${workspace.workdir}/${nodeDef.icon || typeDef?.icon}`}
              />
            </Flex>
          ) : (
            <Flex justify="center" align="center" style={{ height: "100%" }} >
              <BsBoxFill style={{ width: "12px", height: "12px", color: "white" }} />{" "}
            </Flex >
          ),
      });
    });
    data.children?.sort((a, b) => a.title.localeCompare(b.title));
    data.children?.forEach((child) =>
      child.children?.sort((a, b) => a.title.localeCompare(b.title))
    );
    return data;
  }, [t, workspace.nodeDefs]);

  // expand the selected tree
  useEffect(() => {
    if (workspace.editing) {
      const keys: React.Key[] = [];
      resolveKeys(workspace.editing.path, workspace.fileTree!, keys);
      for (const k of expandedKeys) {
        if (keys.indexOf(k) === -1) {
          keys.push(k);
        }
      }
      setExpandedKeys(keys);
      setSelectedKeys([workspace.editing.path]);
    }
  }, [workspace.editing]);

  // expand the selected node def
  useEffect(() => {
    if (workspace.editingNodeDef) {
      const keys: React.Key[] = [];
      resolveKeys(workspace.editingNodeDef.data.name, nodeTree, keys);
      for (const k of expandedNodedefKeys) {
        if (keys.indexOf(k) === -1) {
          keys.push(k);
        }
      }
      setExpandedNodedefKeys(keys);
      setSelectedNodedefKeys([workspace.editingNodeDef.data.name]);
    }
  }, [t, workspace.editingNodeDef]);

  const keysRef = useRef<HTMLDivElement>(null);

  useKeyDown([Hotkey.F2, isMacos ? Hotkey.Enter : ""], keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node && node !== workspace.fileTree) {
      dispatch("rename", node);
    }
  });

  useKeyDown([Hotkey.Delete, isMacos ? Hotkey.MacDelete : ""], keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node && node !== workspace.fileTree) {
      dispatch("delete", node);
    }
  });

  useKeyDown(Hotkey.Escape, keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node) {
      node.editing = false;
      setNewName(null);
    }
  });

  useKeyDown(Hotkey.Duplicate, keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node && node.isLeaf) {
      dispatch("duplicate", node);
    }
  });

  useKeyDown(Hotkey.Copy, keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node && node.isLeaf) {
      dispatch("copy", node);
    }
  });

  useKeyDown(Hotkey.Paste, keysRef, (event) => {
    event.preventDefault();
    const node = findFile(selectedKeys[0], workspace.fileTree!);
    if (node) {
      dispatch("paste", node);
    }
  });

  const submitRename = (node: FileTreeType) => {
    if (!newName) {
      if (fs.existsSync(node.path)) {
        node.editing = false;
      } else {
        const parent = findParent(node, workspace.fileTree);
        if (parent && parent.children) {
          parent.children = parent.children.filter((v) => v !== node);
        }
      }
      setNewName(null);
      return;
    }
    if (node.path.endsWith("/:")) {
      node.path = Path.dirname(node.path) + "/" + newName.replace(/[^\w. _-]+/g, "");
      node.title = Path.basename(node.path);
      fs.mkdirSync(node.path);
    } else if (node.path.endsWith("/.json")) {
      node.path = Path.dirname(node.path) + "/" + newName.replace(/[^\w. _-]+/g, "");
      node.title = Path.basename(node.path);
      fs.writeFileSync(node.path, JSON.stringify(b3util.createNewTree(node.title), null, 2));
      workspace.open(node.path);
    } else {
      const newpath = Path.dirname(node.path) + "/" + newName;
      if (renameFile(node.path, newpath)) {
        setSelectedKeys([newpath]);
      }
    }
    node.editing = false;
    setNewName(null);
  };

  const dispatch = (event: MenuEvent, node: FileTreeType, dest?: FileTreeType) => {
    switch (event) {
      case "open": {
        if (b3util.isTreeFile(node.path)) {
          workspace.open(node.path);
        }
        break;
      }
      case "newFolder": {
        const folderNode: FileTreeType = {
          path: node.path + "/:",
          title: "",
          children: [],
          editing: true,
        };
        node.children?.unshift(folderNode);
        setNewName("");
        if (expandedKeys.indexOf(node.path) === -1) {
          setExpandedKeys([node.path, ...expandedKeys]);
        }
        break;
      }
      case "newFile": {
        const folderNode: FileTreeType = {
          path: node.path + "/.json",
          title: ".json",
          isLeaf: true,
          editing: true,
        };
        node.children?.unshift(folderNode);
        setNewName("");
        if (expandedKeys.indexOf(node.path) === -1) {
          setExpandedKeys([node.path, ...expandedKeys]);
        }
        break;
      }
      case "paste": {
        if (copyFile) {
          let folder = node.path;
          if (node.isLeaf) {
            folder = Path.dirname(node.path);
          }
          const newPath = folder + "/" + Path.basename(copyFile);
          if (fs.existsSync(newPath)) {
            if (node.path === newPath) {
              dispatch("duplicate", node);
            } else {
              const alert = modal.confirm({
                centered: true,
                content: (
                  <Flex vertical gap="middle">
                    <div>
                      <FaExclamationTriangle style={{ fontSize: "60px", color: "#FADB14" }} />
                    </div>
                    <div>{t("explorer.replaceFile", { name: Path.basename(copyFile) })}</div>
                  </Flex>
                ),
                footer: (
                  <Flex vertical gap="middle" style={{ paddingTop: "30px" }}>
                    <Flex vertical gap="6px">
                      <Button
                        danger
                        onClick={() => {
                          workspace.close(newPath);
                          renameFile(node.path, newPath);
                          alert.destroy();
                        }}
                      >
                        {t("replace")}
                      </Button>
                      <Button
                        type="primary"
                        onClick={() => {
                          alert.destroy();
                        }}
                      >
                        {t("cancel")}
                      </Button>
                    </Flex>
                  </Flex>
                ),
              });
            }
          } else {
            fs.copyFileSync(copyFile, newPath);
          }
        }
        break;
      }
      case "copy": {
        if (b3util.isTreeFile(node.path)) {
          setCopyFile(node.path);
        }
        break;
      }
      case "duplicate": {
        if (b3util.isTreeFile(node.path)) {
          for (let i = 1; ; i++) {
            const dupName = Path.basenameWithoutExt(node.path) + " " + i + ".json";
            const dupPath = Path.dirname(node.path) + "/" + dupName;
            if (!fs.existsSync(dupPath)) {
              fs.copyFileSync(node.path, dupPath);
              setSelectedKeys([dupPath]);
              break;
            }
          }
        }
        break;
      }
      case "delete": {
        if (node === workspace.fileTree) {
          return;
        }
        if (node.isLeaf) {
          const alert = modal.confirm({
            centered: true,
            content: (
              <Flex vertical gap="middle">
                <div>
                  <FaExclamationTriangle style={{ fontSize: "60px", color: "#FADB14" }} />
                </div>
                <div>{t("explorer.deleteFile", { name: node.title })}</div>
              </Flex>
            ),
            footer: (
              <Flex vertical gap="middle" style={{ paddingTop: "30px" }}>
                <Flex vertical gap="6px">
                  <Button
                    onClick={() => {
                      alert.destroy();
                      if (node.path === workspace.editing?.path) {
                        workspace.close(node.path);
                      }
                      ipcRenderer.invoke("trashItem", node.path);
                    }}
                  >
                    {t("moveToTrash")}
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      alert.destroy();
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </Flex>
                <div style={{ fontSize: "11px", textAlign: "center" }}>
                  {t("explorer.restoreFileInfo")}
                </div>
              </Flex>
            ),
          });
        } else {
          const alert = modal.confirm({
            centered: true,
            content: (
              <Flex vertical gap="middle">
                <div>
                  <FaExclamationTriangle style={{ fontSize: "60px", color: "#FADB14" }} />
                </div>
                <div>{t("explorer.deleteFolder", { name: node.title })}</div>
              </Flex>
            ),
            footer: (
              <Flex vertical gap="middle" style={{ paddingTop: "30px" }}>
                <Flex vertical gap="6px">
                  <Button
                    onClick={() => {
                      workspace.editors.forEach((editor) => {
                        if (editor.path.startsWith(node.path + "/")) {
                          workspace.close(editor.path);
                        }
                      });
                      ipcRenderer.invoke("trashItem", node.path);
                      alert.destroy();
                    }}
                  >
                    {t("moveToTrash")}
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      alert.destroy();
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </Flex>
                <div style={{ fontSize: "11px", textAlign: "center" }}>
                  {t("explorer.restoreFileInfo")}
                </div>
              </Flex>
            ),
          });
        }
        break;
      }
      case "move": {
        try {
          const destDir = dest?.children ? dest.path : Path.dirname(dest!.path);
          if (destDir === Path.dirname(node.path)) {
            return;
          }
          const newPath = destDir + "/" + Path.basename(node.path);
          const doMove = () => {
            fs.renameSync(node.path, newPath);
            for (const editor of workspace.editors) {
              if (editor.path.startsWith(node.path)) {
                editor.dispatch("rename", destDir + "/" + Path.basename(editor.path));
              }
              console.log("editor move", editor.path === newPath, editor.path, newPath);
              if (editor.path.startsWith(newPath)) {
                console.log("editor reload", editor.path === newPath, editor.path, newPath);
                editor.dispatch("reload");
              }
            }
          };
          if (fs.existsSync(newPath)) {
            const alert = modal.confirm({
              centered: true,
              content: (
                <Flex vertical gap="middle">
                  <div>
                    <FaExclamationTriangle style={{ fontSize: "60px", color: "#FADB14" }} />
                  </div>
                  <div>{t("explorer.replaceFile", { name: Path.basename(node.path) })}</div>
                </Flex>
              ),
              footer: (
                <Flex vertical gap="middle" style={{ paddingTop: "30px" }}>
                  <Flex vertical gap="6px">
                    <Button
                      danger
                      onClick={() => {
                        console.log("close file", newPath);
                        workspace.close(node.path);
                        doMove();
                        alert.destroy();
                      }}
                    >
                      {t("replace")}
                    </Button>
                    <Button
                      type="primary"
                      onClick={() => {
                        alert.destroy();
                      }}
                    >
                      {t("cancel")}
                    </Button>
                  </Flex>
                </Flex>
              ),
            });
          } else {
            doMove();
          }
        } catch (error) {
          console.error("move file:", error);
        }
        break;
      }
      case "revealFile":
        ipcRenderer.invoke("showItemInFolder", node.path);
        break;
      case "rename": {
        if (b3util.isTreeFile(node.path)) {
          node.editing = true;
          setNewName("");
        }
        break;
      }
    }
  };

  const onClick = (info: MenuInfo) => {
    const node = findFile(selectedKeys[0], workspace.fileTree!) ?? workspace.fileTree;
    if (node) {
      dispatch(info.key as MenuEvent, node);
    }
  };

  if (!workspace.fileTree) {
    return null;
  }

  return (
    <Flex
      className="b3-explorer"
      vertical
      ref={keysRef}
      tabIndex={-1}
      style={{ height: "100%" }}
      onContextMenuCapture={() => {
        setContextMenu(createFolderContextMenu(copyFile));
      }}
    >
      <div style={{ padding: "12px 24px" }}>
        <span style={{ fontSize: "18px", fontWeight: "600" }}>{t("explorer.title")}</span>
      </div>
      <Flex
        vertical
        className={isMacos ? undefined : "b3-overflow"}
        style={{ overflow: "auto", height: "100%", paddingBottom: "20px" }}
      >
        <Dropdown menu={{ items: contextMenu, onClick }} trigger={["contextMenu"]}>
          <div>
            <DirectoryTree
              tabIndex={-1}
              treeData={workspace.fileTree ? [workspace.fileTree] : []}
              fieldNames={{ key: "path" }}
              expandedKeys={expandedKeys}
              selectedKeys={selectedKeys}
              onExpand={(keys) => {
                setExpandedKeys(keys);
              }}
              onRightClick={(info) => {
                if (info.node.isLeaf) {
                  setContextMenu(createFileContextMenu(info.node));
                }
                setSelectedKeys([info.node.path]);
              }}
              onSelect={(_, info) => {
                const node = info.selectedNodes.at(0);
                if (node) {
                  dispatch("open", node);
                  setSelectedKeys([node.path]);
                }
              }}
              onDrop={(info) => {
                dispatch("move", info.dragNode, info.node);
              }}
              titleRender={(node) => {
                const value = Path.basename(node.title);
                if (node.editing) {
                  return (
                    <div style={{ display: "inline-flex" }}>
                      <Input
                        defaultValue={value}
                        autoFocus
                        style={{ padding: "0px 0px", borderRadius: "2px" }}
                        onFocus={(e) => {
                          if (value.startsWith(".")) {
                            e.target.setSelectionRange(0, 0);
                          } else {
                            e.target.setSelectionRange(0, value.lastIndexOf("."));
                          }
                        }}
                        onChange={(e) => setNewName(e.target.value)}
                        onPressEnter={() => {
                          if (newName) {
                            submitRename(node);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyUp={(e) => {
                          if (e.code === Hotkey.Escape) {
                            if (!fs.existsSync(node.path)) {
                              const parent = findParent(node, workspace.fileTree);
                              if (parent && parent.children) {
                                parent.children = parent.children.filter((v) => v !== node);
                              }
                            }
                            node.editing = false;
                            setNewName(null);
                          }
                        }}
                        onBlur={() => submitRename(node)}
                      ></Input>
                    </div>
                  );
                } else {
                  return (
                    <div style={{ flex: 1, width: 0, minWidth: 0 }}>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {node.title}
                      </div>
                    </div>
                  );
                }
              }}
              onDragStart={(e) => {
                e.event.dataTransfer.setData("explore-file", e.node.path);
              }}
              draggable={
                newName !== null
                  ? false
                  : {
                    icon: false,
                    nodeDraggable: (node) => {
                      const fileNode = node as unknown as FileTreeType;
                      return !!fileNode.children || b3util.isTreeFile(fileNode.path);
                    },
                  }
              }
              switcherIcon={<DownOutlined />}
            />
          </div>
        </Dropdown>
        <DirectoryTree
          tabIndex={-1}
          fieldNames={{ key: "path" }}
          treeData={[nodeTree]}
          expandedKeys={expandedNodedefKeys}
          selectedKeys={selectedNodedefKeys}
          onExpand={(keys) => {
            setExpandedNodedefKeys(keys);
          }}
          draggable={{ icon: false, nodeDraggable: (node) => !!node.isLeaf }}
          titleRender={(node) => (
            <div style={{ flex: 1, width: 0, minWidth: 0 }}>
              <div
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {node.title}
              </div>
            </div>
          )}
          onSelect={(_, info) => {
            const node = info.node;
            if (node) {
              if (node.isLeaf) {
                workspace.onEditingNodeDef({
                  data: node.def!,
                });
              }
              setSelectedNodedefKeys([node.path]);
            }
          }}
          onDragStart={(e) => {
            e.event.dataTransfer.setData("explore-node", e.node.def?.name ?? "");
          }}
          switcherIcon={<DownOutlined />}
        />
      </Flex>
    </Flex>
  );
};
