import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { useRecoilValue } from 'recoil';

import { RecordTableHeaderCell } from '@/object-record/record-table/components/RecordTableHeaderCell';
import { getRecordTableScopeInjector } from '@/object-record/record-table/utils/getRecordTableScopeInjector';
import { IconPlus } from '@/ui/display/icon';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useScrollWrapperScopedRef } from '@/ui/utilities/scroll/hooks/useScrollWrapperScopedRef';

import { useRecordTableScopedStates } from '../hooks/internal/useRecordTableScopedStates';

import { RecordTableHeaderPlusButtonContent } from './RecordTableHeaderPlusButtonContent';
import { SelectAllCheckbox } from './SelectAllCheckbox';

const StyledTableHead = styled.thead`
  cursor: pointer;
`;

const StyledPlusIconHeaderCell = styled.th<{ isTableWiderThanScreen: boolean }>`
  ${({ theme }) => {
    return `
  &:hover {
    background: ${theme.background.transparent.light};
  };
  padding-left: ${theme.spacing(3)};
  `;
  }};
  border-left: none !important;
  min-width: 32px;
  ${({ isTableWiderThanScreen, theme }) =>
    isTableWiderThanScreen &&
    `position: relative;
    right: 0;
    width: 32px;
    border-right: none !important;
    background-color: ${theme.background.primary};
    `};
  z-index: 1;
`;

const StyledPlusIconContainer = styled.div`
  align-items: center;
  display: flex;
  height: 32px;
  justify-content: center;
  width: 32px;
`;

export const HIDDEN_TABLE_COLUMN_DROPDOWN_ID =
  'hidden-table-columns-dropdown-scope-id';

const HIDDEN_TABLE_COLUMN_DROPDOWN_HOTKEY_SCOPE_ID =
  'hidden-table-columns-dropdown-hotkey-scope-id';

export const RecordTableHeader = ({
  createRecord,
}: {
  createRecord: () => void;
}) => {
  const { hiddenTableColumnsScopeInjector, visibleTableColumnsScopeInjector } =
    getRecordTableScopeInjector();

  const { injectSelectorWithRecordTableScopeId } = useRecordTableScopedStates();

  const hiddenTableColumnsSelector = injectSelectorWithRecordTableScopeId(
    hiddenTableColumnsScopeInjector,
  );

  const visibleTableColumnsSelector = injectSelectorWithRecordTableScopeId(
    visibleTableColumnsScopeInjector,
  );

  const hiddenTableColumns = useRecoilValue(hiddenTableColumnsSelector);

  const scrollWrapper = useScrollWrapperScopedRef();
  const isTableWiderThanScreen =
    (scrollWrapper.current?.clientWidth ?? 0) <
    (scrollWrapper.current?.scrollWidth ?? 0);

  const visibleTableColumns = useRecoilValue(visibleTableColumnsSelector);

  const theme = useTheme();

  return (
    <StyledTableHead data-select-disable>
      <tr>
        <th
          style={{
            width: 30,
            minWidth: 30,
            maxWidth: 30,
          }}
        >
          <SelectAllCheckbox />
        </th>
        {visibleTableColumns.map((column) => (
          <RecordTableHeaderCell
            key={column.fieldMetadataId}
            column={column}
            createRecord={createRecord}
          />
        ))}
        <StyledPlusIconHeaderCell
          isTableWiderThanScreen={isTableWiderThanScreen}
        >
          {hiddenTableColumns.length > 0 && (
            <Dropdown
              dropdownId={HIDDEN_TABLE_COLUMN_DROPDOWN_ID}
              clickableComponent={
                <StyledPlusIconContainer>
                  <IconPlus size={theme.icon.size.md} />
                </StyledPlusIconContainer>
              }
              dropdownComponents={<RecordTableHeaderPlusButtonContent />}
              dropdownPlacement="bottom-start"
              dropdownHotkeyScope={{
                scope: HIDDEN_TABLE_COLUMN_DROPDOWN_HOTKEY_SCOPE_ID,
              }}
            />
          )}
        </StyledPlusIconHeaderCell>
      </tr>
    </StyledTableHead>
  );
};
