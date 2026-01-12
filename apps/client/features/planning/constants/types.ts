export type ActivityEntry = {
    activity: string;
    typeOfActivity: string;
  };
  
  export type ActivityCategoryType = {
  [categoryName: string]: ActivityEntry[] | { code: string; name: string; displayOrder: number; };
  };