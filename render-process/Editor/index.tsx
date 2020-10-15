import * as React from 'react';
import GGEditor, { Mind, RegisterNode } from 'gg-editor';
import { MindData } from 'gg-editor/lib/common/interfaces';
import { Row, Col } from 'antd';
import './Editor.css';

export interface EditorProps {

}

export default class Editor extends React.Component<EditorProps> {
  render() {
    return (
      <GGEditor className="editor">
        <Row className="editorBd">
          <Col span={18} className="editorContent">
            hello
            {/* <BehaviorTree /> */}
          </Col>
          <Col span={6} className="editorSidebar">
            {/* <MindDetailPanel />
            <EditorMinimap /> */}
          </Col>
        </Row>
        {/* <MindContextMenu />
        <MindCopy />
        <MindPaste />
        <MindSave />
        <RegisterBehaviour name="dblclickItemEditLabel" behaviour={() => { }} /> */}
      </GGEditor>
    );
  }
}

function getExclamationMarks(numChars: number) {
  return Array(numChars + 1).join('!');
}