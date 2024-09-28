"use client";

import SubjectPicker from "./subject-picker";

import { useFilter } from "@/app/protected/filter-context";

const SubjectFilter = () => {
  const {
    filters: { subject_id },
    setSubjectId,
  } = useFilter();

  return <SubjectPicker value={subject_id} onChange={setSubjectId} />;
};

export default SubjectFilter;
