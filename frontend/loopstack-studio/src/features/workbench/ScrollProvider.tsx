import React, { createContext, useContext, useState } from 'react';

const ScrollContext = createContext<{
  enableScrollTo: boolean;
  setScrollTo: (value: boolean) => void;
}>({
  enableScrollTo: true,
  setScrollTo: () => {}
});

export const ScrollProvider: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [enableScrollTo, setEnableScrollTo] = useState(true);

  const setScrollTo = (value: boolean) => setEnableScrollTo(value);

  return (
    <ScrollContext.Provider value={{ enableScrollTo, setScrollTo }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => useContext(ScrollContext);
