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

import { memo, FC, useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import classNames from 'classnames';

import { Icon } from '@/components';
import { loggedUserInfoStore } from '@/stores';
import { useToast } from '@/hooks';
import { useCaptchaPlugin } from '@/utils/pluginKit';
import { tryNormalLogged } from '@/utils/guard';
import { bookmark, postVote } from '@/services';
import * as Types from '@/common/interface';
import Reactions from '@/pages/Questions/Detail/components/Reactions';
import Share from '@/components/Share';

interface Props {
  className?: string;
  source: 'question' | 'answer';
  data: {
    id: string;
    votesCount: number;
    isLike: boolean;
    isHate: boolean;
    hideCollect?: boolean;
    collected: boolean;
    collectCount: number;
    username: string;
  };
  qid: string;
  aid?: string;
  title: string;
}

const Index: FC<Props> = ({ className, data, source, qid, aid, title }) => {
  const [votes, setVotes] = useState(0);
  const [like, setLike] = useState(false);
  const [hate, setHated] = useState(false);
  const [bookmarkState, setBookmark] = useState({
    state: data?.collected,
    count: data?.collectCount,
  });
  const { username = '' } = loggedUserInfoStore((state) => state.user);
  const toast = useToast();
  const { t } = useTranslation();
  const vCaptcha = useCaptchaPlugin('vote');

  useEffect(() => {
    if (data) {
      setVotes(data.votesCount);
      setLike(data.isLike);
      setHated(data.isHate);
      setBookmark({
        state: data?.collected,
        count: data?.collectCount,
      });
    }
  }, []);

  const submitVote = (type) => {
    const isCancel = (type === 'up' && like) || (type === 'down' && hate);
    const imgCode: Types.ImgCodeReq = {
      captcha_id: undefined,
      captcha_code: undefined,
    };
    vCaptcha?.resolveCaptchaReq?.(imgCode);

    postVote(
      {
        object_id: data?.id,
        is_cancel: isCancel,
        ...imgCode,
      },
      type,
    )
      .then(async (res) => {
        await vCaptcha?.close();
        setVotes(res.votes);
        setLike(res.vote_status === 'vote_up');
        setHated(res.vote_status === 'vote_down');
      })
      .catch((err) => {
        if (err?.isError) {
          vCaptcha?.handleCaptchaError(err.list);
        }
        const errMsg = err?.value;
        if (errMsg) {
          toast.onShow({
            msg: errMsg,
            variant: 'danger',
          });
        }
      });
  };

  const handleVote = (type: 'up' | 'down') => {
    if (!tryNormalLogged(true)) {
      return;
    }

    if (data.username === username) {
      toast.onShow({
        msg: t('cannot_vote_for_self'),
        variant: 'danger',
      });
      return;
    }

    if (!vCaptcha) {
      submitVote(type);
      return;
    }

    vCaptcha.check(() => {
      submitVote(type);
    });
  };

  const handleBookmark = () => {
    if (!tryNormalLogged(true)) {
      return;
    }
    bookmark({
      group_id: '0',
      object_id: data?.id,
      bookmark: !bookmarkState.state,
    }).then((res) => {
      setBookmark({
        state: !bookmarkState.state,
        count: res.object_collection_count,
      });
    });
  };

  return (
    <div
      className={classNames(
        'd-flex flex-column align-items-center justify-content-start',
        className,
      )}>
      <Button
        title={
          source === 'question'
            ? t('question_detail.question_useful')
            : t('question_detail.answer_useful')
        }
        variant="link"
        className={classNames(
          'p-0 btn-no-border',
          like ? 'text-primary' : 'text-secondary',
        )}
        onClick={() => handleVote('up')}>
        <Icon name="caret-up-fill" size="2rem" />
      </Button>
      <span className="fw-bold fs-5 my-1 text-secondary">{votes}</span>
      <Button
        title={
          source === 'question'
            ? t('question_detail.question_un_useful')
            : t('question_detail.answer_un_useful')
        }
        variant="link"
        className={classNames(
          'p-0 btn-no-border',
          hate ? 'text-primary' : 'text-secondary',
        )}
        onClick={() => handleVote('down')}>
        <Icon name="caret-down-fill" size="2rem" />
      </Button>

      {!data?.hideCollect && (
        <Button
          variant="link"
          className={classNames(
            'p-0 mt-2 btn-no-border d-flex flex-column align-items-center',
            bookmarkState.state ? 'text-warning' : 'text-secondary',
          )}
          title={t('question_detail.question_bookmark')}
          onClick={handleBookmark}>
          <Icon
            name={bookmarkState.state ? 'bookmark-fill' : 'bookmark'}
            size="1.4rem"
          />
          <span className="small mt-1">{bookmarkState.count}</span>
        </Button>
      )}

      <div className="mt-2">
        <Reactions
          objectId={data.id}
          showAddCommentBtn={false}
          className="d-flex flex-column align-items-center gap-1"
        />
      </div>

      <div className="mt-2">
        <Share type={source} qid={qid} aid={aid} title={title} isIconButton />
      </div>
    </div>
  );
};

export default memo(Index);
