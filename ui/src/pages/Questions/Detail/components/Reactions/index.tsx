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

import { FC, memo, useEffect, useState } from 'react';
import { Button, OverlayTrigger, Popover } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { Icon } from '@/components';
import { queryReactions, updateReaction } from '@/services';
import { tryNormalLogged } from '@/utils/guard';
import { isDarkTheme } from '@/utils/common';
import { ReactionItem } from '@/common/interface';

interface Props {
  objectId: string;
  showAddCommentBtn?: boolean;
  handleClickComment?: () => void;
  className?: string;
}

const emojiMap = [
  {
    name: 'heart',
    icon: 'heart-fill',
    className: 'text-danger',
  },
  {
    name: 'smile',
    icon: 'emoji-laughing-fill',
    className: 'text-warning',
  },
  {
    name: 'frown',
    icon: 'emoji-frown-fill',
    className: 'text-warning',
  },
];

const Index: FC<Props> = ({
  objectId,
  showAddCommentBtn,
  handleClickComment = () => {},
  className = 'd-flex flex-wrap',
}) => {
  const [reactions, setReactions] = useState<ReactionItem[]>();
  const [reactIsActive, setReactIsActive] = useState<boolean>(false);
  const { t } = useTranslation('translation');
  const darkMode = isDarkTheme();

  useEffect(() => {
    queryReactions(objectId).then((res) => {
      setReactions(res?.reaction_summary);
    });
  }, []);

  const handleSubmit = (params: { object_id: string; emoji: string }) => {
    if (!tryNormalLogged(true)) {
      setReactIsActive(false);
      return;
    }
    updateReaction({
      ...params,
      reaction: reactions?.find((v) => v.emoji === params.emoji)?.is_active
        ? 'deactivate'
        : 'activate',
    }).then((res) => {
      setReactions(res.reaction_summary);
      setReactIsActive(false);
    });
  };

  const totalCount =
    reactions?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;

  const renderPopover = (props) => (
    <Popover id="reaction-button-tooltip" {...props}>
      <Popover.Body className="d-block d-md-flex flex-wrap p-1">
        {emojiMap.map((d, index) => {
          const reactionItem = reactions?.find((v) => v.emoji === d.name);
          const count = reactionItem?.count || 0;
          const isActive = !!reactionItem?.is_active;
          return (
            <Button
              aria-label={
                isActive
                  ? t('reaction.undo_emoji', { emoji: d.name })
                  : t(`reaction.${d.name}`)
              }
              key={d.icon}
              variant={darkMode ? 'dark' : 'light'}
              active={isActive}
              className={classNames(
                index !== 0 ? 'ms-1' : '',
                'd-inline-flex align-items-center',
              )}
              size="sm"
              onClick={() =>
                handleSubmit({ object_id: objectId, emoji: d.name })
              }>
              <Icon name={d.icon} className={d.className} />
              {count > 0 && <span className="ms-1 small">{count}</span>}
            </Button>
          );
        })}
      </Popover.Body>
    </Popover>
  );

  return (
    <div className={className}>
      {showAddCommentBtn && (
        <Button
          className="rounded-pill me-2 link-secondary btn-reaction"
          variant={darkMode ? 'dark' : 'light'}
          size="sm"
          onClick={handleClickComment}>
          <Icon name="chat-text-fill" />
          <span className="ms-1">{t('comment.btn_add_comment')}</span>
        </Button>
      )}

      <div className="d-flex flex-column align-items-center">
        <OverlayTrigger
          trigger="click"
          placement="top"
          overlay={renderPopover}
          show={reactIsActive}
          onToggle={(show) => setReactIsActive(show)}>
          <Button
            variant="link"
            aria-label={t('reaction.btn_label')}
            aria-haspopup="true"
            active={reactIsActive}
            className={classNames(
              'p-0 btn-no-border smile-btn',
              reactIsActive ? 'text-primary' : 'text-secondary',
            )}>
            <Icon name="emoji-smile" size="1.4rem" />
          </Button>
        </OverlayTrigger>
        {totalCount > 0 && (
          <span
            className="small text-secondary"
            style={{ fontSize: '0.8rem', lineHeight: 1.2 }}>
            {totalCount}
          </span>
        )}
      </div>
    </div>
  );
};

export default memo(Index);
