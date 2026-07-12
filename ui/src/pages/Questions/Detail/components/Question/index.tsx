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

import { memo, FC, useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

import {
  Tag,
  Actions,
  Operate,
  BaseUserCard,
  Comment,
  FormatTime,
  htmlRender,
  ImgViewer,
  Icon,
} from '@/components';
import { useRenderHtmlPlugin } from '@/utils/pluginKit';
import { formatCount, guard } from '@/utils';
import { following } from '@/services';
import { pathFactory } from '@/router/pathFactory';

interface Props {
  data: any;
  hasAnswer: boolean;
  initPage: (type: string) => void;
  isLogged: boolean;
}

const Index: FC<Props> = ({ data, initPage, hasAnswer, isLogged }) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const [searchParams] = useSearchParams();
  const [followed, setFollowed] = useState(data?.is_followed);
  const ref = useRef<HTMLDivElement>(null);

  useRenderHtmlPlugin(ref.current);

  const handleFollow = (e) => {
    e.preventDefault();
    if (!guard.tryNormalLogged(true)) {
      return;
    }
    following({
      object_id: data?.id,
      is_cancel: followed,
    }).then((res) => {
      setFollowed(res.is_followed);
    });
  };

  useEffect(() => {
    if (data) {
      setFollowed(data?.is_followed);
    }
  }, [data]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    htmlRender(ref.current, {
      copySuccessText: t('copied', { keyPrefix: 'messages' }),
      copyText: t('copy', { keyPrefix: 'messages' }),
    });
  }, [ref.current]);

  if (!data?.id) {
    return null;
  }

  return (
    <div>
      <div className="mb-5 d-flex flex-wrap gap-2">
        {data?.tags?.map((item: any) => {
          return <Tag key={item.slug_name} data={item} />;
        })}
      </div>

      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h3 mb-0 text-wrap text-break pb-1 flex-grow-1">
          <Link
            className="link-dark"
            reloadDocument
            to={pathFactory.questionLanding(data.id, data.url_title)}>
            {data.title}
            {data.status === 2
              ? ` [${t('closed', { keyPrefix: 'question' })}]`
              : ''}
          </Link>
        </h1>
        <div className="ms-3 flex-shrink-0">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="followTooltip">{t('follow_tip')}</Tooltip>}>
            <Button
              variant="link"
              size="sm"
              className="p-0 btn-no-border"
              onClick={(e) => handleFollow(e)}>
              <Icon
                name={followed ? 'bell-fill' : 'bell'}
                className={followed ? 'text-warning' : 'text-secondary'}
                style={{ fontSize: '1.4rem' }}
              />
            </Button>
          </OverlayTrigger>
        </div>
      </div>

      <div className="mb-4 border-bottom pb-3">
        <div className="d-flex align-items-center mb-2">
          <BaseUserCard data={data.user_info} />
        </div>

        <div className="d-flex flex-wrap align-items-center small text-secondary">
          {isLogged ? (
            <>
              <Link
                to={`/posts/${data.id}/timeline`}
                className="link-secondary me-3 text-decoration-none">
                <FormatTime time={data.create_time} preFix={t('created')} />
              </Link>

              <Link
                to={`/posts/${data.id}/timeline`}
                className="link-secondary me-3 text-decoration-none">
                <FormatTime time={data.edit_time} preFix={t('Edited')} />
              </Link>
            </>
          ) : (
            <>
              <FormatTime
                time={data.create_time}
                preFix={t('created')}
                className="me-3 text-secondary"
              />

              <FormatTime
                time={data.edit_time}
                preFix={t('Edited')}
                className="me-3 text-secondary"
              />
            </>
          )}

          {data?.view_count > 0 && (
            <div>
              {t('Views')} {formatCount(data.view_count)}
            </div>
          )}
        </div>
      </div>

      <div className="d-flex align-items-stretch gap-3 mt-3 post-body-wrapper">
        <div className="flex-grow-1 min-w-0 d-flex flex-column">
          <ImgViewer>
            <article
              ref={ref}
              className="fmt text-break text-wrap last-p mb-4"
              dangerouslySetInnerHTML={{ __html: data?.html }}
            />
          </ImgViewer>

          <div className="mt-auto pt-4">
            <Comment
              objectId={data?.id}
              mode="question"
              commentId={searchParams.get('commentId')}>
              <Operate
                qid={data?.id}
                type="question"
                memberActions={data?.member_actions}
                title={data.title}
                hasAnswer={hasAnswer}
                isAccepted={Boolean(data?.accepted_answer_id)}
                callback={initPage}
              />
            </Comment>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Actions
            source="question"
            qid={data?.id}
            title={data?.title}
            data={{
              id: data?.id,
              isHate: data?.vote_status === 'vote_down',
              isLike: data?.vote_status === 'vote_up',
              votesCount: data?.vote_count,
              collected: data?.collected,
              collectCount: data?.collection_count,
              username: data.user_info?.username,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(Index);
