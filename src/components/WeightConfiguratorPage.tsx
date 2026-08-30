import React from 'react';
import { CourseSection, GradeComponentWeight, WeightConfig, GradeComponentNode } from '../types';
import { WeightSetup } from './WeightSetup';

interface WeightConfiguratorPageProps {
  activeSection: CourseSection | null;
  onSaveWeights: (
    sectionId: string,
    midtermWeight: number,
    finalWeight: number,
    lectureWeight: number,
    labWeight: number,
    components: GradeComponentWeight[],
    treeData?: GradeComponentNode
  ) => Promise<void>;
  initialConfig?: WeightConfig | null;
}

export const WeightConfiguratorPage: React.FC<WeightConfiguratorPageProps> = ({
  activeSection,
  onSaveWeights,
  initialConfig,
}) => {
  return (
    <WeightSetup
      activeSection={activeSection}
      initialTreeData={initialConfig?.tree_data}
      onSaveWeights={onSaveWeights}
    />
  );
};
