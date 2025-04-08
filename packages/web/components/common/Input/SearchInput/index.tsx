import React, { useState, ChangeEvent, KeyboardEvent } from 'react';
import { Input, InputProps, InputGroup, InputLeftElement } from '@chakra-ui/react';
import MyIcon from '../../Icon';

interface SearchInputProps extends InputProps {
  onSearch?: (text: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ onSearch, ...rest }) => {
  const [inputValue, setInputValue] = useState<string>((rest.value as string) || '');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    if (rest.onChange) {
      rest.onChange(event);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onSearch) {
      onSearch(inputValue);
    }
    if (rest.onKeyDown) {
      rest.onKeyDown(event);
    }
  };

  return (
    <InputGroup alignItems="center" size={'sm'}>
      <InputLeftElement>
        <MyIcon name="common/searchLight" w="16px" color={'myGray.500'} />
      </InputLeftElement>
      <Input
        fontSize="sm"
        bg={'myGray.50'}
        {...rest}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </InputGroup>
  );
};

export default React.memo(SearchInput);
