import { useCallback, useContext, useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { useRecoilValue } from 'recoil';

import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { FieldContext } from '@/object-record/field/contexts/FieldContext';
import { usePersistField } from '@/object-record/field/hooks/usePersistField';
import { entityFieldsFamilyState } from '@/object-record/field/states/entityFieldsFamilyState';
import { entityFieldsFamilySelector } from '@/object-record/field/states/selectors/entityFieldsFamilySelector';
import { FieldRelationMetadata } from '@/object-record/field/types/FieldMetadata';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { useFindOneRecord } from '@/object-record/hooks/useFindOneRecord';
import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { useUpsertRecordFromState } from '@/object-record/hooks/useUpsertRecordFromState';
import { RecordRelationFieldCardContent } from '@/object-record/record-relation-card/components/RecordRelationFieldCardContent';
import { SingleEntitySelectMenuItemsWithSearch } from '@/object-record/relation-picker/components/SingleEntitySelectMenuItemsWithSearch';
import { useRelationPicker } from '@/object-record/relation-picker/hooks/useRelationPicker';
import { EntityForSelect } from '@/object-record/relation-picker/types/EntityForSelect';
import { useFilteredSearchEntityQuery } from '@/search/hooks/useFilteredSearchEntityQuery';
import { IconForbid, IconPlus } from '@/ui/display/icon';
import { LightIconButton } from '@/ui/input/button/components/LightIconButton';
import { Card } from '@/ui/layout/card/components/Card';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useDropdown } from '@/ui/layout/dropdown/hooks/useDropdown';
import { Section } from '@/ui/layout/section/components/Section';

const StyledAddDropdown = styled(Dropdown)`
  margin-left: auto;
`;

const StyledHeader = styled.header<{ isDropdownOpen?: boolean }>`
  align-items: center;
  display: flex;
  margin-bottom: ${({ theme }) => theme.spacing(2)};

  ${({ isDropdownOpen, theme }) =>
    isDropdownOpen
      ? ''
      : css`
          .displayOnHover {
            opacity: 0;
            pointer-events: none;
            transition: opacity ${theme.animation.duration.instant}s ease;
          }
        `}

  &:hover {
    .displayOnHover {
      opacity: 1;
      pointer-events: auto;
    }
  }
`;

const StyledTitle = styled.div`
  font-weight: ${({ theme }) => theme.font.weight.medium};
  padding: ${({ theme }) => theme.spacing(0, 1)};
`;

export const RecordRelationFieldCardSection = () => {
  const { entityId, fieldDefinition } = useContext(FieldContext);
  const {
    fieldName,
    relationFieldMetadataId,
    relationObjectMetadataNameSingular,
    relationType,
  } = fieldDefinition.metadata as FieldRelationMetadata;
  const record = useRecoilValue(entityFieldsFamilyState(entityId));

  const {
    labelIdentifierFieldMetadata: relationLabelIdentifierFieldMetadata,
    objectMetadataItem: relationObjectMetadataItem,
  } = useObjectMetadataItem({
    objectNameSingular: relationObjectMetadataNameSingular,
  });

  const relationFieldMetadataItem = relationObjectMetadataItem.fields.find(
    ({ id }) => id === relationFieldMetadataId,
  );

  const fieldValue = useRecoilValue<
    ({ id: string } & Record<string, any>) | null
  >(entityFieldsFamilySelector({ entityId, fieldName }));

  const isToOneObject = relationType === 'TO_ONE_OBJECT';

  const { record: relationRecordFromFieldValue } = useFindOneRecord({
    objectNameSingular: relationObjectMetadataNameSingular,
    objectRecordId: fieldValue?.id,
    skip: !relationLabelIdentifierFieldMetadata || !isToOneObject,
  });

  // ONE_TO_MANY records cannot be retrieved from the field value,
  // as the record's field is an empty "Connection" object.
  // TODO: maybe the backend could return an array of related records instead?
  const { records: relationRecordsFromQuery } = useFindManyRecords({
    objectNameSingular: relationObjectMetadataNameSingular,
    filter: {
      // TODO: this won't work for MANY_TO_MANY relations.
      [`${relationFieldMetadataItem?.name}Id`]: {
        eq: entityId,
      },
    },
    skip:
      !relationLabelIdentifierFieldMetadata ||
      !relationFieldMetadataItem?.name ||
      isToOneObject,
  });

  const relationRecords = useMemo(
    () =>
      relationRecordFromFieldValue
        ? [relationRecordFromFieldValue]
        : relationRecordsFromQuery,
    [relationRecordFromFieldValue, relationRecordsFromQuery],
  );
  const relationRecordIds = useMemo(
    () => relationRecords.map(({ id }) => id),
    [relationRecords],
  );

  const upsertRecordFromState = useUpsertRecordFromState();

  useEffect(() => {
    relationRecords.forEach((relationRecord) =>
      upsertRecordFromState(relationRecord),
    );
  }, [relationRecords, upsertRecordFromState]);

  const dropdownId = `record-field-card-relation-picker-${fieldDefinition.label}`;

  const { closeDropdown, isDropdownOpen } = useDropdown(dropdownId);

  const {
    identifiersMapper,
    relationPickerSearchFilter,
    searchQuery,
    setRelationPickerSearchFilter,
  } = useRelationPicker();

  const entities = useFilteredSearchEntityQuery({
    filters: [
      {
        fieldNames:
          searchQuery?.computeFilterFields?.(
            relationObjectMetadataNameSingular,
          ) ?? [],
        filter: relationPickerSearchFilter,
      },
    ],
    orderByField: 'createdAt',
    mappingFunction: (recordToMap: any) =>
      identifiersMapper?.(recordToMap, relationObjectMetadataNameSingular),
    selectedIds: relationRecordIds,
    excludeEntityIds: relationRecordIds,
    objectNameSingular: relationObjectMetadataNameSingular,
  });

  const handleCloseRelationPickerDropdown = useCallback(() => {
    setRelationPickerSearchFilter('');
  }, [setRelationPickerSearchFilter]);

  const persistField = usePersistField();
  const { updateOneRecord } = useUpdateOneRecord({
    objectNameSingular: relationObjectMetadataNameSingular,
  });

  const handleRelationPickerEntitySelected = (
    selectedRelationEntity?: EntityForSelect,
  ) => {
    closeDropdown();

    if (!selectedRelationEntity?.id) return;

    if (isToOneObject) {
      persistField(selectedRelationEntity.record);
      return;
    }

    if (!relationFieldMetadataItem?.name) return;

    updateOneRecord({
      idToUpdate: selectedRelationEntity.id,
      updateOneRecordInput: {
        [`${relationFieldMetadataItem.name}Id`]: entityId,
        [relationFieldMetadataItem.name]: record,
      },
    });
  };

  if (!relationLabelIdentifierFieldMetadata) return null;

  return (
    <Section>
      <StyledHeader isDropdownOpen={isDropdownOpen}>
        <StyledTitle>{fieldDefinition.label}</StyledTitle>
        <StyledAddDropdown
          dropdownId={dropdownId}
          dropdownPlacement="right-start"
          onClose={handleCloseRelationPickerDropdown}
          clickableComponent={
            <LightIconButton
              className="displayOnHover"
              Icon={IconPlus}
              accent="tertiary"
            />
          }
          dropdownComponents={
            <SingleEntitySelectMenuItemsWithSearch
              EmptyIcon={IconForbid}
              entitiesToSelect={entities.entitiesToSelect}
              loading={entities.loading}
              onEntitySelected={handleRelationPickerEntitySelected}
            />
          }
          dropdownHotkeyScope={{
            scope: dropdownId,
          }}
        />
      </StyledHeader>
      {!!relationRecords.length && (
        <Card>
          {relationRecords.slice(0, 5).map((relationRecord, index) => (
            <RecordRelationFieldCardContent
              key={`${relationRecord.id}${relationLabelIdentifierFieldMetadata?.id}`}
              divider={index < relationRecords.length - 1}
              relationRecordId={relationRecord.id}
            />
          ))}
        </Card>
      )}
    </Section>
  );
};
