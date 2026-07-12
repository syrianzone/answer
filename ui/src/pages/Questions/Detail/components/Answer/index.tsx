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

import { memo, FC, useEffect, useRef } from 'react';
import { Alert, Badge } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import {
  Actions,
  Operate,
  BaseUserCard,
  Icon,
  Comment,
  FormatTime,
  htmlRender,
  ImgViewer,
} from '@/components';
import { scrollToElementTop, bgFadeOut } from '@/utils';
import { AnswerItem } from '@/common/interface';
import { acceptanceAnswer } from '@/services';
import { useRenderHtmlPlugin } from '@/utils/pluginKit';

interface Props {
  data: AnswerItem;
  /** router answer id */
  aid?: string;
  canAccept: boolean;
  questionTitle: string;
  callback: (type: string) => void;
}
const Index: FC<Props> = ({
  aid,
  data,
  questionTitle = '',
  callback,
  canAccept = false,
}) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'question_detail',
  });
  const [searchParams] = useSearchParams();
  const answerRef = useRef<HTMLDivElement>(null);

  useRenderHtmlPlugin(answerRef.current?.querySelector('.fmt') as HTMLElement);

  const acceptAnswer = () => {
    acceptanceAnswer({
      question_id: data.question_id,
      answer_id: data.accepted === 2 ? '0' : data.id,
    }).then(() => {
      callback?.('');
    });
  };

  useEffect(() => {
    if (!answerRef?.current) {
      return;
    }

    htmlRender(answerRef.current.querySelector('.fmt'), {
      copySuccessText: t('copied', { keyPrefix: 'messages' }),
      copyText: t('copy', { keyPrefix: 'messages' }),
    });
  }, [answerRef.current]);

  useEffect(() => {
    if (aid === data.id) {
      setTimeout(() => {
        const element = answerRef.current;
        scrollToElementTop(element);
        if (!searchParams.get('commentId')) {
          bgFadeOut(answerRef.current);
        }
      }, 100);
    }
  }, [data.id]);

  if (!data?.id) {
    return null;
  }

  return (
    <div id={data.id} ref={answerRef} className="answer-item py-4">
      {data.status === 10 && (
        <Alert variant="danger" className="mb-4">
          {t('post_deleted', { keyPrefix: 'messages' })}
        </Alert>
      )}
      {data.status === 11 && (
        <Alert variant="secondary" className="mb-4">
          {t('post_pending', { keyPrefix: 'messages' })}
        </Alert>
      )}
      <div className="d-flex flex-wrap align-items-center justify-content-between small mb-3 text-secondary">
        <div className="d-flex flex-wrap align-items-center">
          <BaseUserCard data={data.user_info} className="me-3" />
          <span className="me-3 d-flex align-items-center">
            <Icon name="clock" className="me-1" />
            <FormatTime
              time={Number(data.create_time)}
              preFix={t('answered')}
            />
          </span>
          {Number(data.update_time) > 0 && (
            <span className="me-3 d-flex align-items-center">
              <Icon name="pencil" className="me-1" />
              <FormatTime
                time={Number(data.update_time)}
                preFix={t('Edited')}
              />
            </span>
          )}
        </div>
        {data?.accepted === 2 && (
          <Badge bg="success" pill className="d-inline-flex align-items-center">
            <Icon name="check-circle-fill me-1" />
            {t('answers.best_answer')}
          </Badge>
        )}
      </div>
      <div className="d-flex align-items-stretch gap-3 mt-3 post-body-wrapper">
        <div className="flex-grow-1 min-w-0 d-flex flex-column">
          <ImgViewer>
            <article
              className="fmt text-break text-wrap"
              dangerouslySetInnerHTML={{ __html: data?.html }}
            />
          </ImgViewer>

          <div className="mt-auto pt-4">
            <Comment
              objectId={data.id}
              mode="answer"
              commentId={searchParams.get('commentId')}
              canAccept={canAccept}
              isAccepted={data.accepted === 2}
              onAccept={acceptAnswer}>
              <Operate
                qid={data.question_id}
                aid={data.id}
                memberActions={data?.member_actions}
                type="answer"
                isAccepted={data.accepted === 2}
                title={questionTitle}
                callback={callback}
              />
            </Comment>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Actions
            source="answer"
            qid={data?.question_id}
            aid={data?.id}
            title={questionTitle}
            data={{
              id: data?.id,
              isHate: data?.vote_status === 'vote_down',
              isLike: data?.vote_status === 'vote_up',
              votesCount: data?.vote_count,
              hideCollect: true,
              collected: data?.collected,
              collectCount: 0,
              username: data?.user_info?.username,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(Index);
