/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { memo, FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import classNames from 'classnames';

import { Icon } from '@/components';

interface Props {
  count: number;
  order: string;
}

const sortBtns = [
  {
    name: 'score',
    sort: 'default',
    icon: 'star',
  },
  {
    name: 'newest',
    sort: 'updated',
    icon: 'clock',
  },
  {
    name: 'oldest',
    sort: 'created',
    icon: 'clock-history',
  },
];

const Index: FC<Props> = ({ count = 0, order = 'default' }) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail.answers',
  });

  const [searchParams, setUrlSearchParams] = useSearchParams();

  const currentSort =
    order === 'updated' ? 'newest' : order === 'created' ? 'oldest' : 'score';

  const handleSort = (sortVal: string) => {
    searchParams.delete('page');
    searchParams.set('order', sortVal);
    setUrlSearchParams(searchParams);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-between mt-5 mb-3"
      id="answerHeader">
      <h5 className="mb-0 fw-bold">{t('answers_label', { count })}</h5>
      <div className="shadcn-toggle-group">
        {sortBtns.map((btn) => (
          <button
            key={btn.sort}
            type="button"
            className={classNames('btn-toggle-item', {
              active: currentSort === btn.name,
            })}
            onClick={() => handleSort(btn.sort)}>
            <Icon name={btn.icon} />
            <span>{t(btn.name)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default memo(Index);
